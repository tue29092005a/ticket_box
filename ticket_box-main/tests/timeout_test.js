import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    vus: 1,
    iterations: 1,
};

export default function () {
    const url = 'http://localhost:3000/booking/svip';
    const showId = 'show_timeout_1';
    const userId = 'user_timeout_1';

    // 1. User books a single ticket
    const initialPayload = JSON.stringify({
        showId: showId,
        userId: userId,
        seatNo: 'SVIP-T01',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let res = http.post(url, initialPayload, params);
    
    check(res, {
        'initial booking succeeded': (r) => r.status === 200 || r.status === 201,
    });

    // 2. Wait for > 10 minutes to allow the reservation to timeout
    // In a real automated test environment, you would usually mock time or trigger
    // an admin endpoint to expire tickets immediately. Here we demonstrate a sleep.
    console.log("Waiting for 10 minutes and 10 seconds for the booking timeout...");
    sleep(610); 

    // 3. User tries to book 4 more tickets (assuming max quota is 4).
    // Because the first ticket timed out, the quota should have been restored,
    // allowing 4 new bookings to succeed.
    let successCount = 0;
    for (let i = 1; i <= 4; i++) {
        let subsequentPayload = JSON.stringify({
            showId: showId,
            userId: userId,
            seatNo: `SVIP-T01-${i}`,
        });
        
        let subsequentRes = http.post(url, subsequentPayload, params);
        if (subsequentRes.status === 200 || subsequentRes.status === 201) {
            successCount++;
        }
    }

    check(successCount, {
        'all 4 subsequent bookings succeeded (quota restored)': (c) => c === 4,
    });
}
