import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const systemErrorRate = new Rate('system_error_rate');

export const options = {
  scenarios: {
    // 2a: GA Booking Flow
    ga_booking: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '30s',
      exec: 'bookGA',
    },
    // 2b: SVIP Seat Selection
    svip_selection: {
      executor: 'per-vu-iterations',
      vus: 40,
      iterations: 1,
      maxDuration: '30s',
      exec: 'bookSVIPRandom',
    },
    // 2c: SVIP Zero Seat Clash (Extreme)
    svip_clash: {
      executor: 'shared-iterations',
      vus: 500,
      iterations: 500,
      maxDuration: '30s',
      exec: 'bookSVIPClash',
    },
    // 2d: Per-User Quota
    quota_limit: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 10,
      maxDuration: '30s',
      exec: 'bookSVIPQuota',
    },
    // 2e: Sold Out Handling
    sold_out: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '30s',
      exec: 'bookSoldOut',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<50', 'p(99)<100'],
    system_error_rate: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3000';

function registerAndLogin(email) {
  // Register
  http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email, password: 'password' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password: 'password' }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  let token = null;
  try {
    const body = JSON.parse(loginRes.body);
    token = body.accessToken;
  } catch (e) {}
  
  return token;
}

function processBookingResult(res) {
  let isSystemError = false;
  if (res.status === 0 || res.status >= 500) {
    isSystemError = true;
  } else if (res.status === 400) {
    try {
      const body = JSON.parse(res.body);
      const msg = body.message || '';
      const isBusinessError = msg.includes('hết') || msg.includes('trùng lặp') || msg.includes('tối đa') || msg.includes('đã có người đặt');
      if (!isBusinessError) isSystemError = true;
    } catch(e) {
      isSystemError = true;
    }
  } else if (res.status !== 200 && res.status !== 201) {
    isSystemError = true;
  }
  systemErrorRate.add(isSystemError);
}

// 2a: GA Booking
export function bookGA() {
  const token = registerAndLogin(`k6_ga_${__VU}_${__ITER}@test.com`);
  const res = http.post(`${BASE_URL}/booking/ga`, JSON.stringify({ concert_id: 1, quantity: 1, zoneType: 'Normal' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  processBookingResult(res);
  check(res, { 'status is 200/201 or 400': (r) => r.status === 201 || r.status === 200 || r.status === 400 });
}

// 2b: SVIP Selection
export function bookSVIPRandom() {
  const token = registerAndLogin(`k6_svip_rand_${__VU}@test.com`);
  const row = Math.random() > 0.5 ? 'A' : 'B';
  const col = Math.floor(Math.random() * 20) + 1;
  const seatNo = `${row}-${col}`;
  
  const res = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  processBookingResult(res);
}

// 2c: SVIP Clash
export function bookSVIPClash() {
  const token = registerAndLogin(`k6_svip_clash_${__VU}_${__ITER}@test.com`);
  const res = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'A-1' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  processBookingResult(res);
}

// 2d: SVIP Quota
export function bookSVIPQuota() {
  const token = registerAndLogin(`k6_svip_quota_${__VU}@test.com`); // same user for all iterations due to shared-iterations with 1 VU
  const res = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: `B-${__ITER + 1}` }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  processBookingResult(res);
  // Max 2 SVIP per user in TicketBox, so iteration 3+ should fail
}

// 2e: Sold Out
export function bookSoldOut() {
  const token = registerAndLogin(`k6_svip_soldout_${__VU}_${__ITER}@test.com`);
  const res = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: `A-${__ITER % 20 + 1}` }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  processBookingResult(res);
}
