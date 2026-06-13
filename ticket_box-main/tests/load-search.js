import http from 'k6/http';
import { check } from 'k6';

export const options = {
  // Simulates intense Typeahead typing (bypassing debounce)
  scenarios: {
    typeahead_spam: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5000 }, // Ramp up to 5000 VUs
        { duration: '20s', target: 5000 }, // Hold at 5000 VUs
        { duration: '10s', target: 0 },    // Ramp down to 0 VUs
      ],
    },
  },
  thresholds: {
    // Prove microsecond latency under high load for Meilisearch
    // Targeting < 10ms for 95th percentile to prove fast response
    'http_req_duration': ['p(95)<10', 'p(99)<25'], 
    'http_req_failed': ['rate==0'], 
  },
};

export default function () {
  // Simulate partial queries for Typeahead
  const queries = ['ta', 'tay', 'tayl', 'taylor', 's', 'sw', 'swi', 'swift'];
  const query = queries[Math.floor(Math.random() * queries.length)];
  
  const url = `http://localhost:3000/search?q=${query}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.get(url, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
