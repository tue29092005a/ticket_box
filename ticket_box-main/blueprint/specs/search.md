# Đặc tả: Tìm kiếm/Lọc sự kiện hiệu năng cao kết hợp "Local In-Memory Cache + Meilisearch Engine" 

## Mô tả
Tài liệu đặc tả giải pháp tối ưu hóa luồng tìm kiếm và lọc sự kiện cho hệ thống TicketBox dưới bão tải 80.000 user. Hệ thống sử dụng phương án kết hợp "Local In-Memory Cache + Meilisearch Engine". Kiến trúc này giúp giải phóng tải đọc tuyệt đối cho Database PostgreSQL, mang lại trải nghiệm tìm kiếm mờ (Fuzzy Search) tự sửa lỗi chính tả siêu tốc, và chống lại hiện tượng bão phản phệ bộ đệm (Cache Stampede) nhờ cơ chế khóa cục bộ SingleFlight.

## Luồng chính
Hệ thống phân tách luồng xử lý thành bốn kịch bản nghiệp vụ độc lập tùy theo hành vi tương tác của khách hàng:

### Trường hợp 1: Đọc bộ lọc và Danh sách mặc định (Tầng tiền tuyến)
*   **Bước 1:** Khi khán giả truy cập trang chủ hoặc chọn các tiêu chí lọc cố định (Lọc theo phân khu GA/VIP/SVIP, khoảng giá vé, ngày diễn ra), App Server kiểm tra kết quả trong bộ nhớ đệm cục bộ Local In-Memory Cache (node-cache) của chính node đó với TTL = 5 phút.
*   **Bước 2 (Cache Hit):** Nếu dữ liệu tồn tại, App Server lập tức trả về mảng kết quả JSON cho Client với độ trễ siêu tốc (< 1ms), triệt tiêu hoàn toàn kết nối mạng nội bộ ra ngoài.
*   **Bước 3 (Cache Miss & Phòng vệ bão phản phệ):** Nếu Local Cache hết hạn dưới tải cực hạn, App Server bắt buộc kích hoạt cơ chế khóa cục bộ Local Mutex Lock / SingleFlight. Hệ thống chỉ cho phép duy nhất 1 request đại diện đi truy vấn xuống PostgreSQL hậu phương.
*   **Bước 4:** Request đại diện quét qua chỉ mục mở rộng GIN (Generalized Inverted Index) trên PostgreSQL, trả kết quả về cho node App Server để nạp lại vào Local Cache, đồng thời phân phối chung kết quả đó cho các request khác đang xếp hàng chờ.

### Trường hợp 2: Tìm kiếm Từ khóa Động (Tầng trung tuyến)
*   **Bước 1:** Khi người dùng gõ từ khóa tự do (Fuzzy Search) tìm kiếm tên show, tên nghệ sĩ (AI Artist Bio) hoặc địa điểm tổ chức, App Server chủ động bỏ qua Local Cache và chuyển hướng truy vấn thẳng sang cụm Meilisearch Engine thay vì gọi xuống PostgreSQL.
*   **Bước 2:** Meilisearch (được tối ưu hóa chỉ mục trên RAM) thực hiện các thuật toán tìm kiếm mờ, tự động sửa lỗi chính tả, bóc tách tiếng Việt có dấu/không dấu và trả về danh sách 10 sự kiện phù hợp nhất trong vòng vài mili-giây. PostgreSQL hoàn toàn trống tải đọc.

### Trường hợp 3: Tìm kiếm Gợi ý tức thì (Typeahead / Autocomplete)
*   **Bước 1:** Trình duyệt hoặc Mobile App của khán giả áp dụng kỹ thuật Debounce với ngưỡng trì hoãn cố định là 300ms. Request tìm kiếm chỉ được phép phát ra khi người dùng tạm dừng hành vi gõ phím, chặn đứng hoàn toàn lượng request rác gửi liên tục lên hệ thống.
*   **Bước 2:** Khi request vượt qua bộ lọc Debounce lên App Server, hệ thống chuyển tiếp trực tiếp sang Meilisearch để thực hiện quét tiền tố (Prefix Search) trên RAM, trả về mảng JSON rút gọn gồm tên và ảnh đại diện sự kiện với tốc độ micro-giây.

### Trường hợp 4: Đồng bộ Dữ liệu & Invalidation (Luồng Admin)
*   **Bước 1 (Idempotent ID):** Khi Ban tổ chức tạo mới sự kiện ở trang Admin, thay vì đợi PostgreSQL tự tăng Khóa chính (SERIAL ID), App Server phải chủ động sinh sẵn một mã định danh duy nhất (VD: UUID v4 hoặc Snowflake ID) trên RAM.
*   **Bước 2 (Ghi bất đồng bộ song song):** Sử dụng chính UUID vừa tạo làm Khóa chính chung, App Server đẩy đồng thời gói dữ liệu xuống PostgreSQL và nạp chỉ mục sang Meilisearch một cách bất đồng bộ (Write-Through biến thể). Điều này triệt tiêu hoàn toàn sự phụ thuộc chặn đồng bộ (Synchronous Block) giữa 2 cơ sở dữ liệu và tối đa hóa tốc độ phản hồi.
*   **Bước 3:** Đồng thời, Admin Service phát một tín hiệu thông báo xóa cache lên kênh chung của Redis Pub/Sub. Tất cả 30 App Server nhận tin sẽ lập tức xóa bỏ bộ đệm Local Cache cũ của mình để nạp lại dữ liệu mới, đảm bảo khán giả nhìn thấy thông tin mới nhất ngay lập tức ở lượt load trang tiếp theo mà không bị kẹt cache 5 phút.

## Kịch bản lỗi
*   **Lỗi Bão phản phệ bộ đệm (Cache Stampede):** Khi Local Cache hết hạn và hàng vạn request cùng ập tới. Nhờ có SingleFlight (Local Mutex Lock), các request đến sau sẽ bị đưa vào trạng thái chờ thay vì tràn xuống PostgreSQL. Khi request đại diện mang dữ liệu về, toàn bộ request chờ sẽ được giải phóng cùng lúc, bảo vệ DB không bị sập dây chuyền.
*   **Lỗi Meilisearch Engine quá tải hoặc mất kết nối:** Nếu cụm Meilisearch sập, App Server sẽ không có dữ liệu tìm kiếm mờ/gợi ý. Hệ thống có thể chuyển sang trạng thái Graceful Degradation: tạm tắt tính năng tìm kiếm tự do, chỉ cho phép lọc bằng các tiêu chí cố định qua Local Cache và PostgreSQL (quét GIN Index) để duy trì hoạt động cơ bản.
*   **Lỗi đồng bộ Pub/Sub bị trễ:** Chấp nhận tính Nhất quán muộn (Eventual Consistency). Sự kiện Redis Pub/Sub có thể đến các App Server với độ trễ 1-2 giây, khiến một số user tạm thời vẫn thấy dữ liệu cũ trong vài giây trước khi cache được dọn dẹp hoàn toàn.

## Ràng buộc
*   **Bảo vệ PostgreSQL:** Chuyển dịch 100% áp lực lọc đa tiêu chí sang Local RAM và áp lực tìm kiếm động sang Meilisearch.
*   **Hiệu năng và TTL:** Local Cache cho dữ liệu bộ lọc/danh sách mặc định phải thiết lập TTL = 5 phút.
*   **Tối ưu Frontend:** Bắt buộc áp dụng kỹ thuật Debounce 300ms phía Client cho luồng Typeahead để chặn request rác.
*   **Kiến trúc Lightweight:** Đảm bảo Meilisearch (ngôn ngữ Rust) chạy gọn nhẹ qua Docker (cấu hình trong src/), tiết kiệm tài nguyên và dễ dàng demo thực tế.

## Tiêu chí chấp nhận
*   Hệ thống phục vụ mượt mà 80.000 user truy cập đồng thời, hiển thị danh sách và bộ lọc sự kiện ngay lập tức mà PostgreSQL không bị tăng vọt kết nối.
*   Chức năng tìm kiếm mờ và gợi ý tự động hoạt động siêu tốc (micro/mili-giây), xử lý chuẩn xác tiếng Việt có dấu/không dấu và tự động sửa lỗi gõ sai.
*   Cơ chế SingleFlight hoạt động đúng, ngăn chặn tuyệt đối tình trạng sập DB khi bộ đệm cục bộ hết hạn (Cache Miss).
*   Tính nhất quán dữ liệu (Eventual Consistency) qua Redis Pub/Sub đảm bảo thông tin cập nhật từ Admin được phổ biến đến tất cả người dùng muộn nhất trong vòng 1-2 giây.

---
