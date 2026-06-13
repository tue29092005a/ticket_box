# TicketBox Caching — Project Proposal

## 1. Bối cảnh & Vấn đề (Problem Statement)
Các concert âm nhạc lớn tại Việt Nam thu hút hàng chục nghìn khán giả truy cập cùng lúc ngay tại thời điểm mở bán. Khi áp dụng các cơ chế truy vấn thông thường trực tiếp vào cơ sở dữ liệu (PostgreSQL), hệ thống gặp phải những khủng hoảng nghiêm trọng về hiệu năng:
*   **Quá tải cơ sở dữ liệu (Database Bottleneck):** Trang danh sách và trang chi tiết concert có tần suất đọc cực kỳ cao (hàng nghìn request/giây). Việc truy vấn trực tiếp vào DB SQL dưới tải lớn làm cạn kiệt connection pool, dẫn đến sập toàn bộ dịch vụ.
*   **Vấn đề Cache Stampede (Hiệu ứng bầy đàn):** Khi sử dụng cache thông thường với thời gian hết hạn (TTL), thời điểm cache hết hạn trùng với lúc hàng vạn user F5 sẽ khiến toàn bộ request đồng loạt đổ thẳng vào DB để đọc lại dữ liệu mới, gây nghẽn và sập DB ngay lập tức.
*   **Dữ liệu ảo và trễ hạn (Stale Data):** Dữ liệu show diễn ít thay đổi, nhưng thông tin "số vé còn lại" biến động liên tục. Nếu cache số vé quá lâu, khách hàng sẽ thấy số lượng vé ảo (đã hết nhưng vẫn hiển thị còn), dẫn đến tỷ lệ lỗi cao khi bấm mua. Nếu đặt TTL quá ngắn, DB sẽ chịu tải rất lớn.
*   **Trải nghiệm người dùng kém (F5 Fatigue):** Khán giả phải liên tục tải lại trang để biết số lượng vé thực tế còn lại bao nhiêu, gây ức chế và tăng thêm tải trọng không đáng có cho hệ thống.

## 2. Mục tiêu thiết kế (Objectives)
*   **Khả năng chịu tải cao:** Đảm bảo hệ thống phục vụ mượt mà **80.000 user concurrent** truy cập xem thông tin show và số vé trong 5 phút đầu mở bán mà không làm tăng tải trọng lên PostgreSQL quá mức an toàn.
*   **Tối ưu tốc độ phản hồi (Latency):** Đạt thời gian phản hồi ở mức P95 < 200ms đối với các tác vụ đọc thông tin concert và trạng thái vé.
*   **Đồng bộ thời gian thực (Real-time Accuracy):** Cập nhật biến động số lượng vé xuống trình duyệt khán giả gần như ngay lập tức (độ trễ < 1 giây) khi có đơn hàng thành công, loại bỏ hoàn toàn hiện tượng "vé ảo" mà không bắt người dùng phải bấm tải lại trang.
*   **Tính sẵn sàng cao (High Availability):** Đảm bảo hệ thống vẫn hoạt động phục vụ duyệt thông tin ngay cả khi Redis Cluster trung tâm gặp sự cố gián đoạn kết nối ngắn hạn.

## 3. Đối tượng & Nhu cầu tương tác với Cache
*   **Khán giả (Audience):** 
    *   Xem danh sách các concert sắp diễn ra cực nhanh.
    *   Xem sơ đồ khu vực vé (SVG) và số lượng vé còn lại nhảy số tự động (real-time) theo từng giây.
    *   Thực hiện mua vé và nhận được sự phản ánh tức thì về số lượng vé giảm đi trên hệ thống.
*   **Ban tổ chức (Organizer):**
    *   Cấu hình thông tin concert và số lượng vé ban đầu.
    *   Yêu cầu hệ thống phản ánh thay đổi ngay lập tức lên cache khi họ chỉnh sửa thông tin concert hoặc bổ sung vé mà không cần chờ hết TTL.

## 4. Phạm vi giải pháp Caching (Scope)
### Thuộc phạm vi thực hiện:
*   Thiết kế kiến trúc Cache hai tầng (Two-Tier Caching): Tầng 1 (In-Memory Cache tại App Server) và Tầng 2 (Redis Cluster tập trung).
*   Thiết kế cơ chế invalidate cache chủ động qua kênh truyền thông nội bộ (Redis Pub/Sub).
*   Thiết kế cơ chế đẩy dữ liệu biến động số lượng vé thời gian thực xuống trình duyệt người dùng bằng Server-Sent Events (SSE).
*   Đánh giá và so sánh các chiến lược Caching (Cache-aside, Write-through, Hybrid Caching).

### Không thuộc phạm vi thực hiện:
*   Xử lý chi tiết cổng thanh toán (VNPAY/MoMo).
*   Hệ thống kiểm soát soát vé offline tại cổng sự kiện.
*   Thuật toán phân quyền chi tiết (RBAC) và xác thực người dùng.

## 5. Rủi ro & Ràng buộc kỹ thuật
*   **Rủi ro bất nhất quán dữ liệu (Data Inconsistency):** Dưới tải cực cao, việc cache ở RAM của nhiều App Server khác nhau có thể dẫn đến lệch dữ liệu hiển thị giữa các user (độ lệch chấp nhận được trong ngưỡng < 1.5 giây).
*   **Rủi ro cạn kiệt kết nối SSE (SSE Connection Overload):** Duy trì hàng vạn kết nối HTTP Streaming đồng thời đòi hỏi cấu hình tối ưu của reverse proxy (Nginx/Load Balancer) hỗ trợ HTTP/2.
*   **Ràng buộc tài nguyên (Memory Constraints):** Local cache trên App Server phải được giới hạn dung lượng nghiêm ngặt để tránh lỗi tràn bộ nhớ (Out-Of-Memory) của tiến trình Node.js/Go.
