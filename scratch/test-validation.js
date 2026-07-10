const Redis = require('ioredis');

const API_BASE = 'http://localhost:3000';
const redis = new Redis(); // default localhost:6379

async function runTest() {
  try {
    console.log('1. Đăng ký/Đăng nhập User A...');
    const authRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `test_user_${Date.now()}@test.com`, password: 'password123' })
    });
    const authData = await authRes.json();
    if (!authData.accessToken) {
      console.error('=> Lỗi đăng ký:', authData);
      return;
    }
    const token = authData.accessToken;
    console.log('=> Token:', token.substring(0, 20) + '...');

    const seatNo = 'A-10';
    const concert_id = 1;

    console.log(`\n2. User A đặt giữ ghế SVIP ${seatNo}...`);
    const bookRes = await fetch(`${API_BASE}/booking/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ concert_id, type: 'SVIP', quantity: 1, seatNo })
    });
    const bookData = await bookRes.json();
    if (bookRes.ok) {
      console.log('=> Đặt ghế thành công:', bookData);
    } else {
      console.log('=> Đặt ghế có thể đã có sẵn từ test trước, tiếp tục xử lý...', bookData);
    }

    console.log('\n3. Giả lập hết hạn khóa (Worker xóa Redis)...');
    const delCount = await redis.hdel(`concert:${concert_id}:svip_seats`, seatNo);
    console.log(`=> Đã xóa ${delCount} khóa từ Redis.`);

    console.log('\n4. User A (đã hết hạn) cố tình gọi API Thanh toán...');
    const createOrderRes = await fetch(`${API_BASE}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ concert_id, svipSeats: [seatNo], ticketCounts: {}, totalAmount: 2650000, idempotencyKey: `idem_${Date.now()}` })
    });
    
    const createOrderData = await createOrderRes.json();
    if (createOrderRes.status === 400) {
      console.log('=> THÀNH CÔNG: API ĐÃ CHẶN User A với lỗi 400 Bad Request!');
      console.log('=> Thông báo lỗi:', createOrderData.message);
    } else {
      console.log('=> LỖI KHÔNG MONG MUỐN: API phản hồi status', createOrderRes.status);
      console.log('=> Dữ liệu:', createOrderData);
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    redis.disconnect();
  }
}

runTest();
