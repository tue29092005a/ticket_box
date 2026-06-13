import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IdempotencyKey } from '../payment/entities/idempotency-key.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { typeOrmConfig } from '../config/database.config';
import * as readline from 'readline';

async function bootstrap() {
  ConfigModule.forRoot();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('--- TICKETS BOX E2E WEBHOOK TEST ---');
  
  rl.question('Nhập đường link Ngrok của bạn (Ví dụ: https://abcd.ngrok.io): ', async (ngrokUrl) => {
    if (!ngrokUrl) {
      console.log('Bạn chưa nhập Ngrok URL. Đang thoát...');
      process.exit(0);
    }
    
    const webhookUrl = `${ngrokUrl}/payment/webhook`;
    console.log(`\n1. Chuẩn bị gọi PayPal Simulator để gửi webhook tới: ${webhookUrl}`);

    // Lấy PayPal Access Token
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Tạo một mock payload. PayPal Simulator yêu cầu resource version.
    // Lưu ý: PayPal API Simulator đôi khi khá khắt khe về format. 
    // Nếu dùng Simulator API thất bại, ta hướng dẫn dùng Dashboard.
    
    console.log('2. Đang gửi request mô phỏng CHECKOUT.ORDER.APPROVED...');
    const simRes = await fetch(`${process.env.PAYPAL_API_BASE_URL}/v1/notifications/simulate-event`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        url: webhookUrl,
        event_type: 'CHECKOUT.ORDER.APPROVED',
        resource_version: '2.0'
      })
    });

    if (simRes.ok) {
      console.log('✅ Đã yêu cầu PayPal gửi Webhook thành công!');
      console.log('Hãy kiểm tra terminal của Backend xem đã nhận được sự kiện chưa.');
    } else {
      const err = await simRes.text();
      console.log(`❌ Lỗi gửi Webhook Simulator: ${err}`);
      console.log('GỢI Ý: Bạn có thể vào trực tiếp trang https://developer.paypal.com/dashboard/webhooksSimulator để test thủ công!');
    }

    rl.close();
    process.exit(0);
  });
}

bootstrap();
