import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric to track 401 Unauthorized errors
export const errorRate = new Rate('errors');

export const options = {
  // Simulating 10,000 users sending simultaneous refresh token requests
  scenarios: {
    refresh_spam: {
      executor: 'shared-iterations',
      vus: 10000,
      iterations: 10000,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // 0% HTTP 401 errors to verify 30s Grace Period
    'http_req_failed': ['rate==0'],
    'errors': ['rate==0'], 
  },
};

export default function () {
  const url = 'http://localhost:3000/api/auth/refresh';
  const payload = JSON.stringify({
    refreshToken: 'dummy_refresh_token_for_load_test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Check if the response is 200 OK and not 401
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'status is not 401': (r) => r.status !== 401,
  });

  errorRate.add(!success);
}
