import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // 3a: Show List
    show_list: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30s',
      exec: 'getShowList',
    },
    // 3b: Show Detail
    show_detail: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30s',
      exec: 'getShowDetail',
    },
    // 3c: Data Schema Validation
    schema_validation: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      exec: 'validateSchema',
    },
    // 3d: Non-existent Show
    not_found_show: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 100,
      exec: 'getNotFoundShow',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = 'http://localhost:3000';

// 3a: Lấy danh sách show
export function getShowList() {
  const res = http.get(`${BASE_URL}/info/shows`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });
  sleep(1);
}

// 3b: Lấy chi tiết show ngẫu nhiên
export function getShowDetail() {
  const showId = Math.floor(Math.random() * 4) + 1; // 1, 2, 3, or 4
  const res = http.get(`${BASE_URL}/info/show/${showId}`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}

// 3c: Kiểm tra cấu trúc dữ liệu
export function validateSchema() {
  const res = http.get(`${BASE_URL}/info/show/1`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has required fields': (r) => {
      try {
        const data = JSON.parse(r.body);
        return (
          data.hasOwnProperty('id') &&
          data.hasOwnProperty('name') &&
          data.hasOwnProperty('performanceDate') &&
          data.hasOwnProperty('location') &&
          data.hasOwnProperty('description') &&
          data.hasOwnProperty('zones')
        );
      } catch (e) {
        return false;
      }
    },
  });
}

// 3d: Lấy show không tồn tại
export function getNotFoundShow() {
  const res = http.get(`${BASE_URL}/info/show/9999`);
  check(res, {
    'status is 404 or empty (not 500)': (r) => r.status !== 500 && r.status !== 502,
  });
}
