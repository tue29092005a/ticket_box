# Đặc tả: Kiến trúc event-driven cho chức năng Thông báo 

## Mô tả
Tài liệu đặc tả hệ thống xử lý thông báo bất đồng bộ của TicketBox dựa trên mô hình Kiến trúc hướng sự kiện (Event-Driven Architecture) phối hợp với hàng đợi RabbitMQ. 

Hệ thống phân tách luồng xử lý thông báo thành một Queue chuyên biệt độc lập nhằm cô lập hoàn toàn áp lực tài nguyên, tránh gây nghẽn mạch luồng đặt vé và trừ kho cốt lõi. Để tối ưu hóa hiệu năng dưới tải cực hạn, hệ thống áp dụng hai cơ chế bảo vệ nâng cao:
1. **Worker Pooling (Concurrent Consumers):** Kích hoạt đa luồng xử lý song song để giải phóng hàng đợi e-ticket tức thì sau khi khách hàng đặt vé thành công.
2. **Bulk-Notification API (Gom cụm Batching):** Tự động đóng gói dữ liệu của hàng vạn người nhận thành các gói lớn để gửi nhắc nhở trước sự kiện 24 giờ, triệt tiêu hoàn toàn rủi ro bị bên thứ ba (SendGrid, Zalo OA, SMS Gateway) đánh tụt băng thông (Rate Limit).

## Luồng chính
Hệ thống vận hành phân tách thành hai kịch bản nghiệp vụ riêng biệt:

### 1. Luồng xử lý và phát hành E-ticket tức thì (Giao dịch thành công)
Áp dụng cơ chế Worker Pooling để tăng tốc độ giải phóng hàng đợi.

*   **Bước 1 (API Tiền tuyến):** Khi hệ thống xác nhận đơn hàng đã được ghi vào DB PostgreSQL thành công (sau khi trừ kho RAM và nhận Webhook thanh toán), Backend Service phát ra một sự kiện (Event) tên là `order.placed` vào RabbitMQ và nhả kết nối, trả kết quả về cho client ngay lập tức.
*   **Bước 2 (Hàng đợi điều tiết):** RabbitMQ tiếp nhận sự kiện và đẩy vào một Queue chuyên biệt: `notification_queue`. Queue này được cấu hình độc lập hoàn toàn với Queue xử lý đơn hàng để tránh tranh chấp tài nguyên.
*   **Bước 3 (Worker Pooling):** Hệ thống dựng một Module dịch vụ ngầm độc lập trong NestJS. Thay vì sử dụng một tiến trình đơn lẻ, hệ thống kích hoạt cấu hình Concurrent Consumers (Worker Pooling) với số lượng từ 10 đến 20 workers chạy song song, cùng kết nối và cạnh tranh nhặt các event từ `notification_queue` ra xử lý đồng thời.
*   **Bước 4 (Xử lý logic song song):** Mỗi Worker sau khi nhặt được một sự kiện sẽ độc lập lấy thông tin đơn hàng, tự động sinh mã QR (sử dụng thư viện `qrcode` của Node.js) và tiến hành gọi dịch vụ SMTP/Mail để gửi e-ticket trực tiếp về hòm thư của khán giả rải rác theo thời gian thực.

### 2. Luồng xử lý thông báo nhắc nhở hàng loạt (Trước sự kiện 24 giờ)
Áp dụng cơ chế Gom cụm dữ liệu (Batching) để phòng vệ Rate Limit.

*   **Bước 1 (Kích hoạt tiến trình):** Định kỳ trước giờ diễn ra concert 24 tiếng, một Background Cronjob Service sẽ thức dậy, quét DB PostgreSQL để trích xuất danh sách toàn bộ khán giả đã mua vé thành công của sự kiện đó.
*   **Bước 2 (Gom cụm dữ liệu):** Thay vì tạo ra hàng vạn job gửi thư đơn lẻ làm nghẽn mạch mạng nội bộ, tiến trình thực hiện gom cụm dữ liệu (Batching) thông tin người nhận thành các gói lớn với kích thước cấu hình cố định (ví dụ: gói 1.000 users / gói).
*   **Bước 3 (Đẩy tải Bulk API):** Worker thông báo nạp từng gói dữ liệu 1.000 người này và thực hiện một lệnh gọi API duy nhất (Bulk/Batch API Request) sang cổng dịch vụ của bên thứ ba (SendGrid, Zalo OA hoặc SMS Gateway).
*   **Bước 4 (Phân phối hạ tầng):** Hệ thống bên thứ ba tiếp nhận gói Bulk Data và chịu trách nhiệm tự động phân phối tin nhắn xuống thiết bị của người dùng thông qua hạ tầng chuyên dụng của họ. Số lượng request mạng của hệ thống TicketBox được giảm thiểu tối đa (từ 80.000 kết nối xuống chỉ còn 80 request kết nối dạng gói).

## Kịch bản lỗi

*   **Lỗi Cổng thông báo bên thứ ba bị Timeout / Từ chối (Rate Limit):** Trong trường hợp cổng dịch vụ gửi mail/SMS gặp sự cố đứt kết nối hoặc trả về lỗi quá tải, RabbitMQ Worker sẽ không gửi lệnh ACK xác nhận. Tin nhắn tự động được đẩy vào cơ chế Retry Queue kết hợp thuật toán Exponential Backoff (thử lại sau 5s, 10s, 30s) để chờ cổng dịch vụ hồi phục, đảm bảo không làm mất mát thông tin nhận vé của khán giả.
*   **Lỗi Worker trong Pool bị Crash giữa chừng:** Khi dính bão tải, nếu một Worker trong nhóm 20 workers bị sập do tràn bộ nhớ trong lúc đang sinh mã QR, kết nối giữa worker đó với RabbitMQ bị ngắt đột ngột. Nhờ cơ chế quản lý trạng thái của RabbitMQ, tin nhắn đang xử lý dở dang sẽ lập tức được trả ngược về hàng đợi (Re-queue) để các Worker khác đang rảnh nhặt lên xử lý thay thế ngay lập tức.
*   **Lỗi File danh sách người nhận hàng loạt chứa dữ liệu không hợp lệ:** Tại luồng quét thông báo 24h trước sự kiện, nếu phát hiện gói dữ liệu chứa email sai định dạng hoặc số điện thoại bị khuyết, tiến trình Batching sẽ chủ động bóc tách bản ghi lỗi ra một hàng đợi xử lý riêng (Dead Letter Queue), cho phép toàn bộ gói dữ liệu 999 người còn lại tiếp tục được đẩy đi mượt mà mà không làm nghẽn toàn bộ tiến trình thông báo của show diễn.

## Ràng buộc

*   **Tính Stateless của Worker:** Toàn bộ các Worker thuộc Pool thông báo bắt buộc phải chạy Stateless, không lưu trữ trạng thái đơn hàng trong RAM nội bộ nhằm cho phép hệ thống dễ dàng mở rộng quy mô ngang (Scale-out/cắm thêm node) khi bão tải 80.000 user.
*   **Độc lập và Cô lập hàng đợi:** Tuyệt đối không được sử dụng chung hàng đợi thông báo với hàng đợi xử lý hóa đơn core-booking. Tên queue phải được phân định rạch ròi hệ thống: `order_queue` chuyên trách tạo đơn và `notification_queue` chuyên trách xử lý e-ticket/thông báo.
*   **Giới hạn kích thước gói Bulk API:** Kích thước gom cụm dữ liệu (Batch Size) cho luồng nhắc nhở 24h bắt buộc không được vượt quá giới hạn payload quy định của nhà cung cấp bên thứ ba (Ngưỡng an toàn khuyến cáo: $\le 1.000$ bản ghi trên một kết nối API).

## Tiêu chí chấp nhận

1.  Hệ thống giải phóng và phân phối e-ticket tức thì sang hòm thư người dùng ngay sau khi đơn hàng thành công, thời gian xử lý của hàng đợi thông báo đạt mức micro-giây.
2.  **Không gây nghẽn chéo:** Áp dụng luồng xử lý thông báo bất đồng bộ nặng (sinh mã QR, bắn SMTP) không gây ảnh hưởng hay làm tăng thời gian phản hồi của API đặt vé và trừ kho tại tiền tuyến.
3.  **Tính năng Bulk-Notification hoạt động đúng:** Hệ thống gửi thông báo nhắc nhở thành công cho 80.000 người trước 24 giờ mà không bị các nhà mạng chặn kết nối do vi phạm chính sách spam tần suất lớn.
4.  Cơ chế tự động Re-queue hoạt động chuẩn xác khi có node Worker bị sập, bảo toàn tuyệt đối quyền lợi nhận vé của 100% khán giả thật.

---
