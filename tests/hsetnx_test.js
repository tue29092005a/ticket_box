import http from 'k6/http';
import { check } from 'k6';

export const options = {
    scenarios: {
        concurrent_seat_booking: {
            executor: 'shared-iterations',
            vus: 10000,
            iterations: 10000,
            maxDuration: '30s', // adjust based on expected server capacity
        },
    },
};

export default function () {
    const url = 'http://localhost:3000/booking/svip';
    
    // 10,000 VUs trying to book the exact same seat simultaneously
    // Each request uses a different userId to avoid hitting the user quota limit
    const payload = JSON.stringify({
        showId: 'show_1',
        userId: `user_concurrent_${__VU}_${__ITER}`,
        seatNo: 'SVIP-D08',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    // Exactly 1 should succeed (200/201), and 9999 should fail (400/409 conflict).
    check(res, {
        'is status 200/201 (success)': (r) => r.status === 200 || r.status === 201,
        'is status 400/409 (conflict/bad req)': (r) => r.status === 400 || r.status === 409,
    });
}
