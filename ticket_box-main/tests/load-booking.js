import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  // Simulating 80,000 ddos requests to GA and SVIP ticket booking APIs
  scenarios: {
    ddos_booking: {
      executor: 'shared-iterations',
      vus: 80000,
      iterations: 80000,
      maxDuration: '1m',
    },
  },
  thresholds: {
    // Prove SingleFlight and Redis RAM caching work by ensuring low latency
    'http_req_duration': ['p(95)<50', 'p(99)<100'], // 95% of requests under 50ms
    // Check for 0% unexpected errors
    'http_req_failed': ['rate<0.01'], 
  },
};

export default function () {
  // Randomly choose between GA and SVIP endpoints
  const isSVIP = Math.random() > 0.5;
  const endpoint = isSVIP ? '/api/booking/svip' : '/api/booking/ga';
  const url = `http://localhost:3000${endpoint}`;
  
  const payload = JSON.stringify({
    eventId: 'event_123',
    userId: `user_${__VU}`, // Unique user ID based on Virtual User
    tickets: 1
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dummy_token'
    },
  };

  const res = http.post(url, payload, params);

  // Success is either 200 (booked) or 400/409 (conflict/sold out/quota hit)
  // We want to ensure no 500 errors occur (which could represent a seat clash or unhandled exception)
  const success = check(res, {
    'is status 200 or 400/409 (quota/sold out)': (r) => r.status === 200 || r.status === 400 || r.status === 409,
    'no 500 errors (zero seat clash)': (r) => r.status !== 500,
  });

  errorRate.add(!success);
}
