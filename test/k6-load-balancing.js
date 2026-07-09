import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // 4a: Round Robin Distribution
    round_robin: {
      executor: 'constant-vus',
      vus: 300,
      duration: '15s',
      exec: 'getSeats',
    },
    // 4b: Stateless Verification
    stateless: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'verifyStateless',
    },
    // Note: 4c, 4d, 4e, 4f require manual/scripted server stop/start
    // Run them with: node test/helpers/server-control.js kill-booking-one, etc.
    server_down_test: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 200,
      exec: 'getSeatsWithDownNodes',
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
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

export function getSeats() {
  const res = http.get(`${BASE_URL}/booking/show/1/seats`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function verifyStateless() {
  const token = registerAndLogin(`k6_stateless_${__VU}@test.com`);
  
  // Book a seat
  http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'B-20' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  
  // Check 10 times, assuming round robin hits multiple servers
  for (let i=0; i<10; i++) {
    const res = http.get(`${BASE_URL}/booking/show/1/seats`);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'seat B-20 is reserved': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body['B-20'] !== undefined;
        } catch(e) { return false; }
      }
    });
    sleep(0.1);
  }
}

export function getSeatsWithDownNodes() {
  const res = http.get(`${BASE_URL}/booking/show/1/seats`);
  // Just log status, success depends on which scenario is running (4c/d = 200, 4e = 502)
  check(res, { 'status is 200 or 502': (r) => r.status === 200 || r.status === 502 });
}
