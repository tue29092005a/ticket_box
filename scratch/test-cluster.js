const Redis = require('ioredis');

const API_BASE = 'http://localhost';
const PORTS = [3000, 3001, 3002];
const redis = new Redis();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// SSE Listener
async function listenSSE(port, userId) {
  try {
    const res = await fetch(`${API_BASE}:${port}/booking/sse/${userId}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    console.log(`[SSE Server ${port}] Đã mở kết nối theo dõi giao diện.`);
    
    // Đọc luồng vô tận
    (async () => {
      while(true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
           if (line.startsWith('data:')) {
              console.log(`\n🔔 [SSE Server ${port}] GIAO DIỆN CẬP NHẬT: ${line.substring(5).trim()}`);
           }
        }
      }
    })();
  } catch(e) {
    console.error(`[SSE Server ${port}] Lỗi kết nối:`, e.message);
  }
}

async function runTest() {
  try {
    console.log('--- KHỞI TẠO BÀI TEST CHỊU TẢI CLUSTER (RACE CONDITION & PUB/SUB) ---');
    
    // 1. Tạo 3 User
    const users = [];
    for(let i=0; i<3; i++) {
       const res = await fetch(`${API_BASE}:${PORTS[0]}/auth/register`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email: `cluster_user_${Date.now()}_${i}@test.com`, password: 'pw' })
       });
       const data = await res.json();
       // Lấy user id từ JWT (đơn giản hoá, ta có thể dùng ID giả để parse, 
       // hoặc truyền thẳng userId nếu back-end dùng sub. Nhưng do JWT bị mã hoá, 
       // ta cứ truyền bừa 1 ID hoặc parse JWT).
       const token = data.accessToken || data.token;
       const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
       users.push({ token, id: payload.sub });
    }
    console.log('=> Đã tạo 3 User giả lập.');

    // 2. Mở 3 kết nối SSE từ 3 User vào 3 Server khác nhau
    for(let i=0; i<3; i++) {
       listenSSE(PORTS[i], users[i].id);
    }
    
    console.log('=> Đang đợi 2 giây để các kết nối SSE ổn định...');
    await delay(2000);

    // 3. Thực hiện Race Condition: 3 User MUA CÙNG 1 GHẾ (SVIP A-99) CÙNG LÚC
    const seatNo = `A-${Math.floor(Math.random() * 20) + 1}`;
    const concert_id = 1;
    console.log(`\n--- BẮT ĐẦU: 3 User cùng bấm nút tranh ghế [SVIP ${seatNo}] ---`);
    
    // Clear seat in redis and DB to ensure a clean test
    await redis.hdel(`concert:${concert_id}:svip_seats`, seatNo);
    await redis.del(`user:${users[0].id}:concert:${concert_id}:svip`);
    await redis.del(`user:${users[1].id}:concert:${concert_id}:svip`);
    await redis.del(`user:${users[2].id}:concert:${concert_id}:svip`);
    // Execute a direct SQL query to clear the DB
    const { Client } = require('pg');
    const client = new Client({ connectionString: 'postgresql://ticketbox:password@localhost:5434/ticketbox_db' });
    await client.connect();
    await client.query(`UPDATE seat_inventory SET status='AVAILABLE', "reservedBy"=NULL WHERE "seatNo"=$1`, [seatNo]);
    await client.end();
    console.log(`=> Đã dọn dẹp sạch sẽ trạng thái ghế ${seatNo} trên cả DB và Redis.`);

    // Promise.all ép bắn đi cùng 1 mili-giây
    const reqs = PORTS.map((port, idx) => {
       return fetch(`${API_BASE}:${port}/booking/svip`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', Authorization: `Bearer ${users[idx].token}`},
          body: JSON.stringify({ concert_id, type: 'SVIP', quantity: 1, seatNo })
       }).then(async r => {
          const body = await r.json();
          return { port, status: r.status, body };
       });
    });

    const results = await Promise.all(reqs);

    console.log('\n--- KẾT QUẢ ĐẠI CHIẾN TRANH GHẾ ---');
    let successCount = 0;
    let failCount = 0;
    results.forEach(res => {
       if (res.status === 201 || res.status === 200) {
          successCount++;
          console.log(`✅ [Server ${res.port}] THẮNG: User đã giữ được ghế!`);
       } else {
          failCount++;
          console.log(`❌ [Server ${res.port}] THUA: API từ chối (Lỗi ${res.status}) - ${res.body.message}`);
       }
    });

    console.log(`\n=> TỔNG KẾT BẢO VỆ DỮ LIỆU: ${successCount} thành công, ${failCount} bị chặn.`);
    if (successCount === 1 && failCount === 2) {
       console.log('=> PASSED: Zero Seat Clash (Trọng tài Redis hoạt động hoàn hảo).');
    } else {
       console.log('=> FAILED: Hệ thống bị thủng!');
    }

    // Đợi 2 giây để SSE Pub/Sub bắn tin nhắn về màn hình
    console.log('\n=> Đang theo dõi màn hình của 3 Server xem có đồng bộ màu ghế (Pub/Sub) không...');
    await delay(3000);

  } catch (err) {
    console.error(err);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

runTest();
