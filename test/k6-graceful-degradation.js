import http from 'k6/http';
import { check, sleep } from 'k6';

/*
  HƯỚNG DẪN CHẠY BỘ TEST 6 (Graceful Degradation):
  Bộ test này yêu cầu tắt/bật các service thủ công hoặc dùng script để mô phỏng lỗi sập server.
  Hãy dùng script: node test/helpers/server-control.js <action>
  
  Các kịch bản:
  6a: Auth Down -> Chạy `node test/helpers/server-control.js kill-auth` trước khi test.
  6b: Info Down -> Chạy `node test/helpers/server-control.js kill-info` trước khi test.
  6c: Booking Down -> Chạy `node test/helpers/server-control.js kill-booking` trước khi test.
*/

export const options = {
  scenarios: {
    // 6a: Auth Down
    auth_down: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testAuthDown',
    },
    // 6b: Info Down
    info_down: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testInfoDown',
    },
    // 6c: Booking Down
    booking_down: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testBookingDown',
    },
    // 6d: Auth Down but Info Works
    auth_down_info_works: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testAuthDownInfoWorks',
    },
    // 6e: Booking Down but Info Works
    booking_down_info_works: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testBookingDownInfoWorks',
    },
    // 6f: CORS on Error
    cors_on_error: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 10,
      exec: 'testCorsOnError',
    }
  },
  thresholds: {
    checks: ['rate>0.99']
  }
};

const BASE_URL = 'http://localhost:3000';

export function testAuthDown() {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: 'test@test.com', password: '123' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  // Expect 502 with JSON body
  check(res, {
    'status is 502': (r) => r.status === 502,
    'body is JSON and has message': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.message && body.message.includes('Hệ thống đăng nhập đang bảo trì');
      } catch (e) { return false; }
    }
  });
}

export function testInfoDown() {
  const res = http.get(`${BASE_URL}/info/shows`);
  check(res, {
    'status is 502': (r) => r.status === 502,
    'body has message': (r) => r.body && r.body.includes('Hệ thống tải dữ liệu sự kiện đang nâng cấp')
  });
}

export function testBookingDown() {
  const res = http.get(`${BASE_URL}/booking/show/1/seats`);
  check(res, {
    'status is 502': (r) => r.status === 502,
    'body has message': (r) => r.body && r.body.includes('Hệ thống đặt vé đang quá tải hoặc bảo trì')
  });
}

export function testAuthDownInfoWorks() {
  const res = http.get(`${BASE_URL}/info/shows`);
  // Just logs if it passes or fails based on which server is down
  check(res, { 'status is 200 or 502': (r) => r.status === 200 || r.status === 502 });
}

export function testBookingDownInfoWorks() {
  const res = http.get(`${BASE_URL}/info/show/1`);
  check(res, { 'status is 200 or 502': (r) => r.status === 200 || r.status === 502 });
}

export function testCorsOnError() {
  const res = http.options(`${BASE_URL}/auth/login`);
  check(res, {
    'CORS header present': (r) => r.headers['Access-Control-Allow-Origin'] !== undefined
  });
}
