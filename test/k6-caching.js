import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // 1a: Cache Hit Performance
    cache_hit: {
      executor: 'constant-vus',
      vus: 500,
      duration: '60s',
      exec: 'getShowOne',
    },
    // 1b: Cache Stampede Prevention
    cache_stampede: {
      executor: 'shared-iterations',
      vus: 2000,
      iterations: 2000,
      exec: 'getShowOneAndVerify',
    },
    // 1c: Multi-Show Concurrent
    multi_show: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30s',
      exec: 'getShowRandom',
    },
    // 1d: Homepage Load
    homepage_load: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '30s',
      exec: 'getShows',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3000';

// 1a: Get Show 1 continuously
export function getShowOne() {
  const res = http.get(`${BASE_URL}/info/show/1`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

// 1b: Verify Cache Stampede
export function getShowOneAndVerify() {
  const res = http.get(`${BASE_URL}/info/show/1`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'data is consistent': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === 1 && typeof body.name === 'string';
      } catch (e) {
        return false;
      }
    }
  });
}

// 1c: Multi-Show Concurrent
export function getShowRandom() {
  const showId = Math.floor(Math.random() * 4) + 1;
  const res = http.get(`${BASE_URL}/info/show/${showId}`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

// 1d: Homepage
export function getShows() {
  const res = http.get(`${BASE_URL}/info/shows`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
