# Đặc tả: Chiến lược Caching và Phòng vệ Hệ thống Tải cực hạn

## Mô tả
Tài liệu đặc tả kiến trúc xử lý tải cực hạn cho hệ thống bán vé sự kiện TicketBox, được thiết kế để đáp ứng kịch bản flash sale với **80.000 user truy cập trong 5 phút đầu** mà không làm sập Database (PostgreSQL) hay Central Cache (Redis Cluster). 

Hệ thống áp dụng Mô hình Cache 2 tầng (Two-Tier Caching) kết hợp cơ chế Đẩy dữ liệu chủ động (Server-Sent Events - SSE), được chia làm hai chiến lược riêng biệt cho hai loại phân khu:
1. **Phân khu Vé Thường (GA, CAT, VIP):** Sử dụng Hybrid Caching (In-Memory Cache + Redis String/Counter) kết hợp Eventual Consistency qua Pub/Sub và SSE.
2. **Phân khu SVIP (Chọn vị trí đích danh):** Sử dụng cấu trúc Redis Hash Map kết hợp HSETNX nguyên tử làm "trọng tài tối cao" để triệt tiêu lỗi tranh chấp vị trí (Zero Seat Clash).

## Phân loại dữ liệu và Chiến lược Caching
- **Chiến lược 1: Cache-Aside + SingleFlight (Mutex Lock)** $\rightarrow$ Áp dụng cho Dữ liệu Ít thay đổi (Thông tin Concert, Tên/Bio Nghệ sĩ). Dữ liệu này được lưu trữ phân tán: MongoDB quản lý nội dung phi cấu trúc (Thông tin Concert chi tiết, Artist Bio, Mô tả sự kiện), trong khi PostgreSQL quản lý dữ liệu có cấu trúc quan hệ (Thời gian, Địa điểm biểu diễn).
- **Chiến lược 2: Hybrid Caching (Phương án 3a)** $\rightarrow$ Áp dụng cho Dữ liệu Số lượng (Counters) biến động liên tục dưới tải cực hạn bao gồm: Số lượng tồn kho vé còn lại của phân khu Vé Thường (GA, CAT, VIP) và Bộ đếm giới hạn số lượng vé đặt trên mỗi tài khoản của User (Per-User String Counter).
- **Chiến lược 3: Thực thể tương tác đích danh (Phương án 3b)** $\rightarrow$ Áp dụng cho Dữ liệu Sơ đồ Ghế SVIP phức tạp bao gồm: Sơ đồ hiển thị vị trí ghế tương tác của phân khu SVIP, mảng trạng thái chi tiết của từng mã ghế đơn lẻ (`available`, `USER_123_HOLD`, `booked`) và danh sách tọa độ ghế chi tiết đang khóa giữ của từng tài khoản người dùng.
- **Chiến lược 4: Hybrid Synchronous-Asynchronous Caching** $\rightarrow$ Kế thừa phương án 3b cho khu SVIP nhưng bổ sung thêm **Chốt chặn Database đồng bộ (Synchronous DB Write)**. PostgreSQL sẽ là người phán xử cuối cùng cho mọi giao dịch đổi trạng thái ghế để bảo vệ tuyệt đối khỏi lỗi Mất dữ liệu (Data Loss) do Redis sập hoặc Lệch pha (Failover).

## Luồng chính

### 1. Luồng Tác vụ Đọc (Hiển thị thông tin Concert & Nghệ sĩ)
*   **Quy trình Cache-Aside kết hợp SingleFlight:** Khi Client truy cập trang chi tiết sự kiện, App Server tiến hành kiểm tra dữ liệu trên cụm Redis Cluster.
*   **Cache Hit:** Nếu dữ liệu tồn tại, trả về kết quả ngay lập tức cho Client.
*   **Cache Miss & Chống Cache Stampede:** Nếu Redis rỗng, tính năng **SingleFlight (Mutex Lock)** sẽ khóa luồng truy cập trên cấp độ App Server. Kể cả có hàng vạn request cùng gọi tới, chỉ duy nhất **1 request đại diện** được phép đi qua để truy vấn Database gốc (Lấy mô tả sự kiện/artist bio từ MongoDB và ghép với thông tin thời gian/địa điểm từ PostgreSQL).
*   **Nạp lại Cache:** Đại diện sau khi lấy được dữ liệu sẽ lưu vào Redis, giải phóng Lock và trả dữ liệu về cho tất cả các request đang đứng chờ. Cụm Database (MongoDB & PostgreSQL) tuyệt đối an toàn trước làn sóng 80.000 users.
*   **Invalidate (Vô hiệu hóa):** Khi admin cập nhật thông tin sự kiện trên CMS, backend sẽ thực hiện xóa (Invalidate) key tương ứng trên Redis để hệ thống tự động làm mới ở request tiếp theo.

### 2. Luồng Tác vụ Ghi - Phân khu Vé Thường (VIP, Normal - Khối lượng K)
*   **Bước 1 - Giữ chỗ thần tốc trên RAM (Trọng tài Redis):** App Server kiểm tra giới hạn cá nhân bằng `INCRBY` và trừ kho tổng bằng `HINCRBY kho_tổng -K`. Nếu thành công, Redis ghi nhận User đang giữ K vé. Tuyệt đối KHÔNG ghi trạng thái PENDING xuống Database để tránh thảm họa "Hot Row".
*   **Bước 2 - Queue chờ thanh toán (Wait Queue):** Đẩy thông báo giữ chỗ thành công về Client và đẩy 1 Delayed Message (10 phút) vào RabbitMQ để làm bộ đếm ngược giải phóng vé.
*   **Bước 3 - Chốt chặn Thanh toán (Synchronous DB Decrement):** Khi User bấm Thanh toán, App Server đập 1 lệnh duy nhất xuống Database: `UPDATE zone_inventory SET availableSlots = availableSlots - K WHERE availableSlots >= K`. 
    * Nếu Update thành công $\rightarrow$ Chốt vé an toàn.
    * Nếu Update thất bại (do Redis sập hoặc Lệch pha làm trôi thêm người vào) $\rightarrow$ Từ chối giao dịch, bảo vệ 100% kho vé vật lý.
*   **Bước 4 - Xử lý Bất đồng bộ:** Sau khi thanh toán thành công, đẩy message vào `payment_success_queue` để Worker ngầm ghi Hóa đơn và chi tiết Vé xuống PostgreSQL. Phát Pub/Sub + SSE để cập nhật giao diện khán giả.

### 3. Luồng Tác vụ Ghi - Phân khu SVIP (Đặt ghế đích danh)
*   **Bước 1 - Kiểm tra giới hạn cá nhân:** Sử dụng Redis Hash Map, key `concert:1:zone:svip`, field là mã ghế (vd: A01), value là trạng thái (`available`, `USER_123_HOLD`, `booked`). App Server kiểm tra số ghế user đang giữ bằng lệnh `HLEN user:{userId}:concert:{concertId}:zone:svip`. Nếu tổng số ghế muốn đặt vượt giới hạn $\rightarrow$ từ chối ngay.
*   **Bước 2 - Khóa vị trí (Trọng tài Redis):** App Server thực thi lệnh nguyên tử `HSETNX` lên Redis Cluster. 
    * Nếu trả về `0` (Thất bại): Ghế đã bị người khác giật, trả lỗi HTTP 400.
    * Nếu trả về `1` (Thành công): Cấp phép đi tiếp vào vòng DB.
*   **Bước 3 - Chốt chặn Database (Synchronous DB Write):** Dùng lệnh SQL `UPDATE seat_inventory SET status='RESERVED' WHERE seatNo=:seat AND status='AVAILABLE'`. Đây là chốt chặn vật lý chống Data Loss/Lệch pha.
    * Nếu Update thành công: Ghế chính thức thuộc về User. Phát SSE.
    * Nếu Update thất bại (do DB đã lưu cho người khác): Rollback Redis và báo lỗi.
*   **Bước 4 - Thanh toán:** App Server gọi lệnh `UPDATE seat_inventory SET status='BOOKED' WHERE seatNo=:seat AND reservedBy=:userId`. Nếu thành công, xuất vé.
*   **Bước 5 - Cập nhật sơ đồ (Pub/Sub + SSE):** Sau khi khóa hoặc mua thành công, Worker phát tín hiệu `{"zone": "svip", "seat": "D08", "status": "booked"}`. Các App Server nhận tin, sửa đổi Local Cache và đẩy SSE để đổi màu ghế.

## Kịch bản lỗi

*   **Hết hạn giữ vé (Hold Timeout Rollback tại phân khu Vé Thường):** Nếu sau 10 phút User không thanh toán, Worker tự động chạy và trả vé về bằng lệnh Redis `HINCRBY kho_tổng +K` và trừ Quota cá nhân. KHÔNG CẦN chạm tới Database vì Database chưa hề bị trừ (Chỉ bị trừ khi thanh toán). Đẩy SSE để cập nhật số lượng hiển thị.
*   **Hết hạn giữ ghế (Hold Timeout Rollback tại phân khu SVIP):** Kèm theo hành động giữ ghế thành công, một Delayed Message (10 phút) được đẩy vào RabbitMQ. Nếu sau 10 phút user không thanh toán, Worker tự động chạy và **BẮT BUỘC thực thi đồng thời 3 lệnh nguyên tử:** 1) Gọi `HDEL` trên Hash hoặc đổi trạng thái Field của ghế đó về `available`. 2) Gọi `DECRBY user:{userId}:concert:{concertId}:zone:svip 1` để hoàn trả lại Quota giới hạn cá nhân. 3) Chạy lệnh `UPDATE seat_inventory SET status='AVAILABLE', reservedBy=NULL` để nhả khóa vật lý dưới PostgreSQL. Cuối cùng kích hoạt Pub/Sub + SSE để chuyển màu ghế sang Xanh cho người khác mua.
*   **Trễ tín hiệu mạng nội bộ (Lag mạng Pub/Sub):** Khi có App Server nhận tín hiệu Pub/Sub chậm hơn (ví dụ trễ 1 giây), những user trên App Server đó vẫn thấy vé còn/ghế trống. Hệ quả là tăng tỷ lệ request bị từ chối do dữ liệu lỗi thời ngắn hạn.
*   **Mất kết nối Redis tạm thời:** Nhờ Tầng 1 (Local Cache), App Server vẫn phục vụ khán giả xem thông tin show hiển thị mượt mà mà không sập hệ thống hay trả về lỗi 500.

## Ràng buộc
* **Tính toàn vẹn Dữ liệu Giới hạn:** Thao tác kiểm soát quota user bắt buộc sử dụng `INCRBY/DECRBY` (vé thường) hoặc `HLEN` (SVIP) và thao tác giữ ghế SVIP bắt buộc dùng `HSETNX`. Lệnh phải chạy thẳng trên Redis để đảm bảo tính nguyên tử đơn luồng.
* **Tối ưu Băng thông & Hiệu năng Đọc:** Tầng 1 (Local Cache) bắt buộc có TTL 1 giây cho số vé và 5 phút cho thông tin show. Bắt buộc áp dụng Local Mutex Lock/SingleFlight khi Cache Miss.
* **Đồng bộ Trạng thái Bất đồng bộ:** Giao tiếp trạng thái ghế và vé phải sử dụng Pub/Sub kết hợp luồng đẩy HTTP 1 chiều (SSE) xuống client, không dùng phương pháp truy vấn ngược (Polling) từ client.
* **Cô lập tài nguyên hàng đợi (Queue Isolation):** Hệ thống bắt buộc sử dụng các Queue độc lập và tách biệt cho từng nghiệp vụ (ví dụ: `order_queue` để xử lý đơn hàng/kho vé và `notification_queue` để xử lý gửi mail/mã QR), tránh hiện tượng tranh chấp, nghẽn cổ chai hoặc ảnh hưởng chéo về mặt tài nguyên giữa các tác vụ độc lập.
*   **Tính toàn vẹn Dữ liệu Giới hạn:** Thao tác kiểm soát quota user bắt buộc sử dụng `INCRBY/DECRBY` (vé thường) hoặc `HLEN` (SVIP) và thao tác giữ ghế SVIP bắt buộc dùng `HSETNX`. Lệnh phải chạy thẳng trên Redis để đảm bảo tính nguyên tử đơn luồng.
*   **Tối ưu Băng thông & Hiệu năng Đọc:** Tầng 1 (Local Cache) bắt buộc có TTL 1 giây cho số vé và 5 phút cho thông tin show. Bắt buộc áp dụng Local Mutex Lock/SingleFlight khi Cache Miss.
*   **Đồng bộ Trạng thái Bất đồng bộ:** Giao tiếp trạng thái ghế và vé phải sử dụng Pub/Sub kết hợp luồng đẩy HTTP 1 chiều (SSE) xuống client, không dùng phương pháp truy vấn ngược (Polling) từ client.

## Tiêu chí chấp nhận

1.  Hệ thống xử lý mượt mà 80.000 user truy cập đồng thời trong 5 phút đầu mà website không sập, DB và Redis không bị quá tải.
2.  **Zero Seat Clash:** Tại phân khu SVIP, tuyệt đối không có hiện tượng 2 người dùng đặt trùng 1 ghế dưới tải cực hạn.
3.  Tính năng Real-time Invalidation & Push hoạt động đúng: Màn hình trình duyệt của tất cả user cập nhật số vé giảm (Vé Thường) hoặc đổi màu ghế (SVIP) mượt mà không cần F5.
4.  Cơ chế Rollback vé thường (Worker xử lý lỗi DB) và Tự động giải phóng ghế SVIP (sau 10 phút Pending) hoạt động chuẩn xác, không làm thất thoát tài nguyên kho vé.
5.  **Cơ chế Cache Warm-up (Khôi phục thảm họa):** Khi hệ thống khởi động lại (Startup) hoặc Redis mất dữ liệu, hệ thống tự động đồng bộ (Reverse Sync) toàn bộ dữ liệu vé đã thanh toán (PAID), kho vé tồn đọng và hạn mức cá nhân từ PostgreSQL lên lại Redis. Đảm bảo giao diện hiển thị chính xác mọi thời điểm.

---
