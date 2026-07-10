# TicketBox - Hệ Thống Bán Vé Tải Cực Hạn (Flash Sale)

TicketBox là một hệ thống mô phỏng nền tảng bán vé sự kiện âm nhạc, được thiết kế chuyên biệt để chịu tải cực hạn (Flash Sale) lên tới hàng chục nghìn người truy cập đồng thời mà không sập hệ thống hay sai lệch dữ liệu.

Dự án áp dụng kiến trúc Hybrid Caching (Redis + Node Cache), Message Queue (RabbitMQ), và xử lý bất đồng bộ kết hợp Server-Sent Events (SSE) để truyền trạng thái sơ đồ ghế Real-time.

## 🚀 Công nghệ sử dụng
- **Backend:** NestJS, TypeORM
- **Frontend:** Vanilla JS, HTML, CSS (Không cần build tool)
- **Cơ sở dữ liệu:** PostgreSQL
- **Caching & Real-time:** Redis (Cluster mode mô phỏng)
- **Message Broker:** RabbitMQ
- **Tìm kiếm:** Meilisearch

---

## 🛠 Yêu cầu hệ thống (Prerequisites)
Trước khi cài đặt, đảm bảo máy tính của bạn đã cài đặt sẵn các công cụ sau:
1. **Node.js** (Phiên bản >= 18.x)
2. **Docker** & **Docker Compose** (Dùng để chạy hệ sinh thái cơ sở dữ liệu)
3. **Git**

---

## ⚙️ Hướng dẫn Cài đặt & Chạy dự án (Local Development)

### Bước 1: Khởi động hệ sinh thái Cơ sở dữ liệu (Infrastructure)
Hệ thống yêu cầu PostgreSQL, Redis, RabbitMQ và Meilisearch để hoạt động. Bạn không cần cài đặt thủ công từng món, chỉ cần dùng Docker Compose.

Mở terminal tại thư mục gốc của dự án (`ticket-box/`) và chạy:
```bash
docker-compose up -d
```
*Ghi chú: Lệnh này sẽ kéo các images về và khởi chạy nền. RabbitMQ Management có thể truy cập tại `http://localhost:15672` (guest/guest).*

### Bước 2: Cài đặt và Chạy Backend (NestJS)
1. Vẫn ở thư mục gốc (`ticket-box/`), tiến hành cài đặt thư viện:
```bash
npm install
```
2. Khởi động Backend Server:
```bash
npm run start
```
*Backend sẽ tự động đồng bộ schema với PostgreSQL (TypeORM sync), tự động nạp Cache Warm-up từ DB lên Redis và chạy tại địa chỉ: `http://localhost:3000`.*

### Bước 3: Cài đặt và Chạy Frontend
1. Dự án này sử dụng Frontend thuần (Vanilla JS/HTML/CSS) nên cực kỳ nhẹ và không cần bước build phức tạp. Mở một cửa sổ terminal mới, di chuyển vào thư mục Frontend:
```bash
cd frontend
```
2. Khởi động một static server đơn giản. Bạn có thể dùng `http-server` (nếu đã cài sẵn qua npm) hoặc Python:
```bash
npx http-server -p 8080
```
*(Hoặc nếu có Python: `python -m http.server 8080`)*
3. Mở trình duyệt và truy cập: `http://localhost:8080` để trải nghiệm hệ thống.

---

## 🏗 Kiến trúc Cốt lõi & Luồng Vận hành
Nếu bạn muốn tìm hiểu sâu về cách hệ thống chống sập và xử lý tranh chấp vé (Zero Seat Clash), hãy đọc các tài liệu đặc tả đính kèm:
1. **`blueprint/specs/caching.md`**: Chi tiết chiến lược Hybrid Caching 2 tầng và luồng xử lý bất đồng bộ.
2. **`cache_solution.txt`**: Giải thích cặn kẽ 3 phương án Cache và lý do chọn phương án tối ưu.
3. **SSE & Redis Pub/Sub**: Nằm trong `sse.service.ts` và `booking.controller.ts`, lo nhiệm vụ "bơm" trạng thái ghế xuống giao diện tức thì.
4. **Worker Queue**: `notifications.service.ts` chịu trách nhiệm chạy các Background Worker xử lý Timeout nhả vé sau 10 phút, và đồng bộ dữ liệu vào PostgreSQL.

## 👥 Chức năng chính
- Hiển thị trang chủ và sơ đồ ghế bằng SSR / Caching.
- Cho phép người dùng giữ chỗ trong 10 phút (Chống đụng độ ghế bằng cơ chế khóa nguyên tử `HSETNX` trên Redis).
- Hết 10 phút không thanh toán: Worker RabbitMQ tự động thu hồi và nhả vé (Rollback) cập nhật real-time cho toàn hệ thống.
- Luồng thanh toán kết hợp kiến trúc **Hybrid Synchronous-Asynchronous Caching**: Giữ chỗ thần tốc trên Redis, nhưng Chốt chặn thanh toán tuyệt đối an toàn bằng lệnh cập nhật Đồng bộ dưới Database (PostgreSQL) chống Oversell 100%.
