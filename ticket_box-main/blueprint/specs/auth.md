# Đặc tả: Cơ chế Xác thực Phân quyền và Phòng vệ Tải Auth cực hạn (auth.md)

## Mô tả
Tài liệu đặc tả kiến trúc phòng vệ hệ thống Xác thực và Phân quyền (Authentication & Authorization) của TicketBox, nhằm bảo vệ hệ thống trước bão tải xác thực từ 80.000 user truy cập đồng thời. 

Hệ thống áp dụng phương án **Tách biệt bộ đệm Refresh Token (Redis Cache-Aside) kết hợp Thời gian ân hạn (Grace Period)**. Phương pháp này giúp cô lập hoàn toàn Database PostgreSQL khỏi hàng vạn request đổi token định kỳ (mỗi 1-5 phút). Toàn bộ áp lực thẩm định token được chuyển dồn sang bộ nhớ RAM của Redis Cluster. Đồng thời, kiến trúc này khắc phục triệt để lỗi người dùng bị văng phiên đăng nhập do giật lag mạng gây ra các request trùng lặp.

## Luồng chính

Hệ thống vận hành phân tách thành 3 luồng riêng biệt:

### 1. Luồng Ghi (Khi Đăng nhập/Khởi tạo Phiên)
*   **Bước 1:** Khi người dùng cung cấp thông tin hợp lệ, App Server thực hiện khởi tạo cặp thẻ: Access Token (JWT tĩnh, chứa các claim về thông tin định danh và vai trò RBAC) và Refresh Token (chuỗi Opaque string/UUID ngẫu nhiên).
*   **Bước 2:** Hệ thống lưu trữ Refresh Token mới vào Database PostgreSQL để làm dữ liệu gốc lưu trữ dài hạn.
*   **Bước 3 (Cache-Aside chủ động):** Đồng thời, App Server ghi đè (Write-Through) cặp `Refresh Token -> Thông tin User` trực tiếp lên RAM của cụm Redis Cluster với TTL dài (ví dụ: 7 ngày).

### 2. Luồng Xác thực API (Khi truy cập tài nguyên)
*   **Bước 1:** Trình duyệt người dùng gắn JWT Access Token vào HTTP Header để gọi API.
*   **Bước 2:** Các App Server NestJS (hoạt động Stateless) thực hiện giải mã trực tiếp thuật toán JWT trên RAM cục bộ để kiểm tra tính hợp lệ, hạn sử dụng và quyền truy cập (RBAC) của người dùng. Luồng này hoàn toàn không phát sinh lệnh gọi xuống Database hay Redis.

### 3. Luồng Đọc/Ghi (Khi Đổi Token Ngầm - Refresh Flow)
*   **Bước 1:** Khi Access Token 1-5 phút hết hạn, hệ thống ngầm của Client đồng loạt gửi request chứa Refresh Token lên Server để xin cấp mới.
*   **Bước 2:** Các App Server **tuyệt đối không truy vấn xuống PostgreSQL**. Chúng chọc thẳng sang cụm Redis tập trung (Centralized Cache) để đọc và thẩm định Refresh Token bằng các lệnh kiểm tra siêu tốc với độ trễ micro-giây (<0.5ms).
*   **Bước 3:** Nếu token hợp lệ, hệ thống cấp phát cặp Access Token / Refresh Token mới gửi về cho Client.
*   **Bước 4 (Kích hoạt Grace Period):** Token cũ trên RAM Redis không bị xóa bỏ ngay lập tức. Thay vào đó, nó được cập nhật thuộc tính cấu trúc JSON sang trạng thái `IN_GRACE_PERIOD` và được duy trì sự sống tạm thời thêm từ 10 đến 30 giây. Cặp token vừa cấp mới sẽ được đính kèm vào thông tin của token đang ân hạn này.

## Kịch bản lỗi

*   **Lỗi Client spam đổi token đồng thời (Race Condition):** Dưới áp lực tải cao, thiết bị của người dùng hoặc script chạy bất đồng bộ phía Client có thể kích hoạt gửi dồn dập 2-3 request đổi token trong cùng một mili-giây do nghẽn mạng. Nhờ cơ chế Thời gian ân hạn, đối với các request đến sau, Redis nhận diện Token đang ở trạng thái `IN_GRACE_PERIOD` và lập tức trả về nguyên vẹn cặp Access Token vừa được tạo ra ở request đầu tiên. Điều này triệt tiêu hoàn toàn lỗi vỡ luồng auth cục bộ, giúp trải nghiệm người dùng mượt mà, không bị đẩy ra ngoài bắt đăng nhập lại một cách vô lý.
*   **Lỗi Refresh Token hết hạn (Sau 7 ngày):** Khi quá chu kỳ 7 ngày không thao tác, key của Refresh Token trên Redis tự động bị thu hồi theo cơ chế TTL. Các request đổi token gửi lên sẽ không tìm thấy dữ liệu, App Server từ chối request bằng HTTP 401 Unauthorized và yêu cầu người dùng phải đăng nhập lại từ đầu để lấy phiên mới.
*   **Lỗi node Redis Auth bị mất kết nối (Graceful Degradation):** Nếu cụm Redis phụ trách xác thực gặp sự cố đứt kết nối tạm thời, các App Server không thể đọc Refresh Token. Nhằm bảo vệ tôn chỉ "Cô lập tuyệt đối PostgreSQL khỏi luồng đọc xác thực trong Ticket Rush", hệ thống sẽ chủ động hy sinh tính năng Refresh Token: Các request đổi token bị từ chối bằng HTTP 503 Service Unavailable hoặc 401 Unauthorized. Database PostgreSQL không bị truy xuất fallback, đảm bảo CPU luôn ở mức thấp an toàn để chuyên tâm gánh luồng Ghi hóa đơn cốt lõi.

## Ràng buộc

*   **Tính Stateless tuyệt đối:** 30 App Server đứng sau Load Balancer không lưu bất kỳ trạng thái phiên đăng nhập (session) nào vào RAM nội bộ (Local Cache). Điều này đảm bảo khả năng mở rộng quy mô ngang (Scale-out) trơn tru của hệ thống.
*   **Giới hạn Thời gian sống (TTL):** Hệ thống bắt buộc tuân thủ chặt chẽ ma trận thời gian sau:
    *   Access Token (JWT): 1 đến 5 phút (Tuổi thọ siêu ngắn).
    *   Refresh Token (RAM Redis): 7 ngày.
    *   Thời gian ân hạn (Grace Period): 10 đến 30 giây kể từ thời điểm đổi mới lần đầu.
*   **Cô lập Database:** Tầng PostgreSQL phải được bảo vệ 100%, không nhận bất kỳ request đọc Refresh Token nào trong suốt quá trình diễn ra săn vé Flash Sale.

## Tiêu chí chấp nhận

1.  Khắc phục triệt để hiện tượng sập Database do hàng vạn user đi đổi token cùng lúc. Tải truy vấn token dồn 100% về cụm Redis Cluster.
2.  Truy vấn thẩm định Token trên RAM Redis xử lý siêu tốc, đạt thời gian phản hồi ở mức micro-giây (< 0.5ms).
3.  Cơ chế Grace Period dung thứ thành công các lỗi mạng nội bộ phía trình duyệt, loại bỏ tỷ lệ request bị từ chối oan do hành vi click trùng lặp (Spam Refresh Token).

---
