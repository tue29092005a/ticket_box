import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Định nghĩa Custom Metric để tách biệt lỗi hệ thống thực tế khỏi các lỗi nghiệp vụ (hết vé, trùng key...)
const systemErrorRate = new Rate('system_error_rate');

export const options = {
  scenarios: {
    // Luồng giả lập ĐỈNH TẢI: 56,000 lượt truy cập dồn vào 1 phút đầu tiên
    ticket_rush_1m: {
      executor: 'ramping-arrival-rate',
      startRate: 100,                 // Khởi động nhẹ nhàng với 100 req/s
      timeUnit: '1s',
      preAllocatedVUs: 1000,          // Khởi tạo sẵn 1000 người dùng ảo để tránh nghẽn luồng client
      maxVUs: 2500,                   // Giới hạn tối đa 2500 VUs phòng khi server xử lý chậm
      stages: [
        // 30 giây đầu: Đẩy tải lên đỉnh điểm 1800 request/giây để thử thách RAM Redis
        { duration: '30s', target: 1800 },

        // 30 giây sau: Hạ tải dần về mốc 0 để kết thúc chu kỳ 1 phút đầu tiên
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    // Chỉ tính tỷ lệ lỗi hệ thống thực tế (mất kết nối, 5xx, lỗi code, sai schema) phải < 1%
    system_error_rate: ['rate<0.01'],
    // Đáp ứng chính xác ràng buộc p95 < 200ms của tài liệu thiết kế
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v1/tickets/reserve';

  let userId, idKey, quantity;
  const selector = Math.random();

  if (selector < 0.05) {
    // KỊCH BẢN A: Giao dịch trùng lặp (Spam cùng 1 Idempotency Key gửi liên tiếp)
    userId = `USER_SPAM_IDEMPOTENCY_${__VU}`;
    idKey = `key_fixed_for_spam_${__VU}`;
    quantity = 1;
  } else if (selector < 0.10) {
    // KỊCH BẢN B: Mua vượt giới hạn per-user (Cố tình mua lách luật 2-4 vé liên tiếp)
    userId = `USER_GREEDY_${__VU}`;
    idKey = `key_unique_${__VU}_${__ITER}_${Math.floor(Math.random() * 100000)}`;
    quantity = 2;
  } else {
    // KỊCH BẢN C (90%): Khán giả thông thường click đặt mua 1 vé hợp lệ
    userId = `USER_NORMAL_${__VU}_${__ITER}`;
    idKey = `key_normal_${__VU}_${__ITER}_${Math.floor(Math.random() * 100000)}`;
    quantity = 1;
  }

  const payload = JSON.stringify({
    userId: userId,
    concertId: '1',
    zoneId: 'svip',
    quantity: quantity,
    idempotencyKey: idKey, // Gửi kèm Idempotency Key trong Request Body theo đúng định nghĩa của Controller
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // --- BỘ LỌC THÔNG MINH: PHÂN TÁCH LỖI NGHIỆP VỤ VÀ LỖI HỆ THỐNG ---
  let isSystemError = false;

  if (res.status === 0 || res.status >= 500) {
    // Lỗi kết nối mạng vật lý hoặc lỗi máy chủ (5xx)
    isSystemError = true;
  } else if (res.status === 400) {
    try {
      const responseBody = JSON.parse(res.body);
      const msg = responseBody.message;

      // Danh sách chính xác các thông báo lỗi NGHIỆP VỤ hợp lệ từ các API exceptions trong backend
      const validBusinessErrors = [
        'Vé tại khu vực bạn chọn đã hết.',
        'Yêu cầu đặt vé này đang được xử lý hoặc đã trùng lặp.',
        'Bạn đã vượt quá giới hạn đặt vé tối đa'
      ];

      // Nếu KHÔNG phải lỗi nghiệp vụ hợp lệ -> Đánh dấu lỗi hệ thống (lỗi validation dữ liệu, schema, thiếu trường...)
      if (!validBusinessErrors.some(errorStr => msg && msg.includes(errorStr))) {
        isSystemError = true;
        console.warn(`[CẢNH BÁO LỖI HỆ THỐNG - 400]: ${res.body}`);
      }
    } catch (e) {
      // Phản hồi không đúng chuẩn JSON của NestJS
      isSystemError = true;
      console.error(`[CRITICAL] Phản hồi lỗi không đúng định dạng JSON: ${res.body}`);
    }
  } else if (res.status !== 201) {
    // Bất kỳ mã lỗi nào khác ngoài 201 và 400 (vd: 404, 403)
    isSystemError = true;
  }

  // Cộng dồn tỷ lệ lỗi hệ thống vào Custom Metric
  systemErrorRate.add(isSystemError);

  // Bộ kiểm tra tính đúng đắn của logic nghiệp vụ
  check(res, {
    // 201: Thành công đẩy vào MQ; 400: Trả về lỗi hết vé hoặc chặn trùng hợp lệ
    'Xử lý logic nghiệp vụ đúng chuẩn (201/400)': (r) => r.status === 201 || r.status === 400,
    // Phản hồi từ bộ đệm RAM (Tầng 1 + Tầng 2) bắt buộc phải phản hồi siêu tốc dưới 20ms
    'Tốc độ phản hồi đạt chuẩn đệm (< 20ms)': (r) => r.timings.duration < 20,
  });

  // Giãn cách giả lập hành vi user thật click chuột
  sleep(Math.random() * 0.05 + 0.02);
}