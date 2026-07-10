import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/*
  BỘ TEST TÍCH HỢP CUỐI CÙNG (E2E FLASH SALE)
  Mô phỏng 80,000 user truy cập dồn dập vào phút đầu tiên.
  Do chạy local nên đã được scale xuống phù hợp với sức mạnh máy tính cá nhân.
*/

const systemErrorRate = new Rate('system_error_rate');
const readLatency = new Trend('read_latency');
const bookingLatency = new Trend('booking_latency');

export const options = {
  scenarios: {
    // 7a: Flash Sale Simulation (Ramping)
    flash_sale: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 800,
      stages: [
        { duration: '30s', target: 500 }, // Khởi động lên 500 req/s
        { duration: '30s', target: 500 }, // Giữ đỉnh tải 500 req/s
        { duration: '30s', target: 0 },   // Hạ nhiệt
      ],
    },
    // 7b: Sustained Load
    sustained_load: {
      executor: 'constant-vus',
      vus: 200,
      duration: '3m',
      startTime: '90s', // Chạy sau khi flash_sale kết thúc
    }
  },
  thresholds: {
    system_error_rate: ['rate<0.01'],
    read_latency: ['p(95)<200'],
    booking_latency: ['p(95)<50'],
  },
};

const BASE_URL = 'http://localhost:3000';

function registerAndLogin(email) {
  http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email, password: 'password' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password: 'password' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  try { return JSON.parse(loginRes.body).accessToken; } catch (e) { return null; }
}

export default function () {
  const rand = Math.random();
  let isSystemError = false;

  if (rand < 0.7) {
    // 70% Đọc thông tin (Info Service)
    const res = http.get(`${BASE_URL}/info/show/1`);
    readLatency.add(res.timings.duration);
    
    if (res.status === 0 || res.status >= 500) isSystemError = true;
    check(res, { 'read success (200)': (r) => r.status === 200 });
    
  } else if (rand < 0.9) {
    // 20% Đặt vé GA
    const token = registerAndLogin(`flash_ga_${__VU}_${__ITER}@test.com`);
    const res = http.post(`${BASE_URL}/booking/ga`, JSON.stringify({ concert_id: 1, quantity: 1, zoneType: 'Normal' }), {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    bookingLatency.add(res.timings.duration);
    
    if (res.status === 0 || res.status >= 500) {
      isSystemError = true;
    } else if (res.status === 400 && !res.body.includes('hết') && !res.body.includes('tối đa')) {
      isSystemError = true;
    }
    
  } else {
    // 10% Đặt vé SVIP
    const token = registerAndLogin(`flash_svip_${__VU}_${__ITER}@test.com`);
    const row = Math.random() > 0.5 ? 'A' : 'B';
    const col = Math.floor(Math.random() * 20) + 1;
    const res = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: `${row}-${col}` }), {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    bookingLatency.add(res.timings.duration);
    
    if (res.status === 0 || res.status >= 500) {
      isSystemError = true;
    } else if (res.status === 400 && !res.body.includes('Đã hết') && !res.body.includes('đã có người đặt') && !res.body.includes('tối đa')) {
      isSystemError = true;
    }
  }

  systemErrorRate.add(isSystemError);
  sleep(Math.random() * 0.1); // Giãn cách 0-100ms
}
