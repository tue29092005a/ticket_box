import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // 5a: GA Rollback
    ga_rollback: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m', // Needs to wait >30s
      exec: 'testGARollback',
    },
    // 5b: SVIP Rollback
    svip_rollback: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
      exec: 'testSVIPRollback',
    },
    // 5c: Quota Restore
    quota_restore: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '1m',
      exec: 'testQuotaRestore',
    }
  },
  thresholds: {
    checks: ['rate>0.99']
  }
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

export function testGARollback() {
  const token = registerAndLogin(`k6_worker_ga_${__VU}@test.com`);
  
  // Lấy inventory trước
  const invBeforeRes = http.get(`${BASE_URL}/booking/show/1/inventory`);
  const invBefore = JSON.parse(invBeforeRes.body).Normal || 0;
  
  // Đặt 2 vé
  http.post(`${BASE_URL}/booking/ga`, JSON.stringify({ concert_id: 1, quantity: 2, zoneType: 'Normal' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  
  // Đợi >30s (timeout hiện tại cấu hình cho test là 30s)
  console.log("Waiting 35s for GA rollback...");
  sleep(35);
  
  // Kiểm tra inventory sau
  const invAfterRes = http.get(`${BASE_URL}/booking/show/1/inventory`);
  const invAfter = JSON.parse(invAfterRes.body).Normal || 0;
  
  check(invAfter, { 'GA inventory rolled back': (val) => val === invBefore });
}

export function testSVIPRollback() {
  const token = registerAndLogin(`k6_worker_svip_${__VU}@test.com`);
  const seatNo = 'B-39';
  
  // Đặt ghế
  http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  
  console.log("Waiting 35s for SVIP rollback...");
  sleep(35);
  
  // Kiểm tra ghế đã nhả
  const seatRes = http.get(`${BASE_URL}/booking/show/1/seats`);
  const seats = JSON.parse(seatRes.body);
  
  check(seats, { 'SVIP seat is available again': (val) => val[seatNo] === undefined });
}

export function testQuotaRestore() {
  const token = registerAndLogin(`k6_worker_quota_${__VU}@test.com`);
  
  // Đặt max 2 vé SVIP cho user (giới hạn là 2 vé/user)
  http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'A-31' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'A-32' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  
  // Đặt vé 3 sẽ lỗi
  const resFail = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'A-33' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  check(resFail, { 'quota exceeded check': (r) => r.status === 400 || r.status === 429 });
  
  console.log("Waiting 35s for quota rollback...");
  sleep(35);
  
  // Đặt vé mới sau khi timeout
  const resSuccess = http.post(`${BASE_URL}/booking/svip`, JSON.stringify({ concert_id: 1, seatNo: 'A-34' }), {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  });
  check(resSuccess, { 'quota restored': (r) => r.status === 201 || r.status === 200 });
}
