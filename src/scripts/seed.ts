import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { REDIS_CLIENT } from '../config/redis.config';
import { MEILISEARCH_CLIENT } from '../config/meilisearch.config';
import * as fs from 'fs';
const csv = require('csv-parser');

async function bootstrap() {
  console.log('Bắt đầu Seed Data...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userRepository = app.get(getRepositoryToken(User));
  const redisClient = app.get(REDIS_CLIENT);
  const meiliClient = app.get(MEILISEARCH_CLIENT);

  // 1. Postgres Seed: Tạo user
  const adminEmail = 'admin@ticketbox.com';
  let admin = await userRepository.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = userRepository.create({ email: adminEmail, passwordHash: 'hashed_password' });
    await userRepository.save(admin);
    console.log('Đã tạo Admin User trong Postgres.');
  }

  // 2. Redis Seed: SVIP Seat Matrix và GA Inventory
  const showId = '11111111-1111-1111-1111-111111111111';
  const gaKey = `show:${showId}:inventory`;
  const svipHashKey = `show:${showId}:svip_seats`;

  // Xoá dữ liệu cũ
  await redisClient.del(gaKey);
  await redisClient.del(svipHashKey);

  // Set 1000 vé GA
  await redisClient.hset(gaKey, 'GA', 1000);
  console.log('Đã nạp 1000 vé GA vào Redis.');

  // Tạo CSV mẫu cho VIP Guest Import
  const csvPath = 'vip_guests.csv';
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'seatNo,name,email\nA1,Trấn Thành,tt@email.com\nA2,Sơn Tùng,mtp@email.com\n');
  }

  // 3. Import VIP Guest từ CSV vào Redis SVIP Seats
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath).pipe(csv());
    
    stream.on('data', async (row) => {
      // Đặt sẵn vé cho khách mời (Pre-allocate) bằng cách ghi trực tiếp vào HASH
      await redisClient.hset(svipHashKey, row.seatNo, row.email);
      console.log(`Đã Import khách VIP: Ghế ${row.seatNo} cho ${row.name}`);
    });

    stream.on('end', () => resolve(true));
    stream.on('error', (error) => reject(error));
  });

  // 4. Meilisearch Seed: Dummy shows
  const index = meiliClient.index('shows');
  const dummyShows = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Anh Trai Say Hi - Live Concert', location: 'Hà Nội', date: '2026-10-10' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Rap Việt All Star', location: 'TPHCM', date: '2026-11-20' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Đen Vâu - Show Của Đen', location: 'Đà Nẵng', date: '2026-12-05' },
  ];
  await index.addDocuments(dummyShows);
  console.log('Đã nạp Dummy Shows vào Meilisearch.');

  console.log('Seed Data hoàn tất.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Lỗi khi Seed Data:', err);
  process.exit(1);
});
