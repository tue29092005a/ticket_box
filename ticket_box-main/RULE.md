# TicketBox System - Development Rules & Guidelines

Tài liệu này quy định các nguyên tắc bắt buộc (Rules) dành cho toàn bộ kỹ sư và AI Agents tham gia phát triển hệ thống TicketBox nhằm tránh các lỗi triển khai sai lệch kiến trúc hoặc lạm dụng giả lập (mocking).

## 1. Nguyên tắc Không Giả lập (Anti-Mocking Directive)
- **KHÔNG ĐƯỢC** sử dụng dữ liệu tĩnh (mock data/stubs), `setTimeout`, hoặc `setInterval` để giả lập thao tác trên luồng Frontend.
- Toàn bộ tương tác người dùng phải gọi API thật qua `fetch()` xuống Backend.
- Trạng thái giao diện chỉ được phép cập nhật khi Backend trả về tín hiệu thành công (VD: HTTP 200/201) hoặc thông qua luồng đẩy sự kiện thời gian thực (SSE/WebSocket).

## 2. Vòng đời Tích hợp Dữ liệu Khép kín (Lifecycle Explicit)
- **Tải trạng thái ban đầu:** Khi một Component hoặc Trang web (Page) vừa khởi tạo, BẮT BUỘC phải gọi một API GET để tải trạng thái hiện hữu từ hệ thống Backend/Redis. Không bao giờ được ngầm định dữ liệu ban đầu là trạng thái trống/available.
- **Đồng bộ Real-time:** Ngay sau khi tải trạng thái ban đầu hoàn tất, lập tức thiết lập kết nối SSE/WebSocket. Mọi dữ liệu nhận được từ luồng này phải tiếp tục ghi đè và cập nhật chính xác lên trạng thái UI.

## 3. Kiến trúc Phân tán & Thời gian thực (Distributed Architecture Constraints)
- Thiết kế hệ thống đẩy tin (SSE/WebSocket) **KHÔNG ĐƯỢC PHÉP** phát thanh (broadcast) theo kiểu cục bộ (chỉ dựa vào tập hợp Client kết nối trong RAM của một Node.js Server duy nhất).
- Yêu cầu cấu trúc **Redis Pub/Sub** bắt buộc:
  - Khi có sự kiện thay đổi dữ liệu (đặt vé, thanh toán...), Server xử lý lệnh đó phải dùng lệnh `publish` bắn nội dung lên một Redis Channel chung.
  - Mọi App Server trong cluster đều phải `subscribe` kênh Redis này, và khi nhận được message, chúng mới tiến hành phân phối tin nhắn xuống cho tập hợp các Client đang kết nối trực tiếp với chúng thông qua SSE.

## 4. Checklist Rà soát Đóng gói (QA & Review Checklist)
Trước khi merge code hoặc kết thúc phiên làm việc, QA Agent hoặc Kỹ sư kiểm định phải rà soát chặt chẽ:
- [ ] Frontend có đang gọi API thật hoàn toàn không? Có rà soát và xóa sạch mã nguồn giả lập (`setTimeout`) chưa?
- [ ] Cơ chế Server-Sent Events (SSE) đã được tích hợp với Redis Pub/Sub chưa, hay đang bị cô lập trên RAM của từng process?
- [ ] Giao diện (VD: Sơ đồ ghế/Giỏ hàng) đã gọi API Init Status khi vừa Load trang (F5) chưa?
- [ ] Quy trình kiểm thử Chéo: Đã thử mở 2 Tab trình duyệt độc lập (1 Login, 1 Ẩn danh) và kiểm chứng luồng cập nhật chéo giữa 2 Tab chưa?
