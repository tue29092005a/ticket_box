import http from 'k6/http';
import { check } from 'k6';

export const options = {
    scenarios: {
        quota_test: {
            executor: 'shared-iterations',
            vus: 50,
            iterations: 50,
            maxDuration: '10s',
        },
    },
};

export default function () {
    const url = 'http://localhost:3000/booking/svip';
    
    // Simulate 50 parallel requests from a single user
    // We use different seat numbers so it only fails due to user quota limit, not seat conflict
    const payload = JSON.stringify({
        showId: 'show_1',
        userId: 'user_quota_test',
        seatNo: `SVIP-Q-${__VU}-${__ITER}`,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    // In TicketBox, max 4 tickets per show per user.
    // Out of 50 requests, exactly 4 should succeed, and 46 should fail (e.g. 400 or 429).
    check(res, {
        'is status 200/201 (success)': (r) => r.status === 200 || r.status === 201,
        'is status 400/429 (quota exceeded)': (r) => r.status === 400 || r.status === 429,
    });
}
