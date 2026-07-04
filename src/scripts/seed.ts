import 'dotenv/config';
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

  const dummyConcerts = [
    { id: 1, name: 'Anh Trai Say Hi - Live Concert', location: 'Hà Nội', performanceDate: new Date('2026-10-10') },
    { id: 2, name: 'Rap Việt All Star', location: 'TPHCM', performanceDate: new Date('2026-11-20') },
    { id: 3, name: 'Đen Vâu - Show Của Đen', location: 'Đà Nẵng', performanceDate: new Date('2026-12-05') },
    { id: 4, name: 'Anh Trai "Say Hi" 2025', location: 'Hà Nội', performanceDate: new Date('2026-12-20') },
  ];

  const { Concert } = require('../info/entities/concert.entity');
  const concertRepository = app.get(getRepositoryToken(Concert));
  const { SeatInventory } = require('../booking/entities/seat-inventory.entity');
  const { ZoneInventory } = require('../booking/entities/zone-inventory.entity');
  const seatInventoryRepo = app.get(getRepositoryToken(SeatInventory));
  const zoneInventoryRepo = app.get(getRepositoryToken(ZoneInventory));

  for (const cData of dummyConcerts) {
    let concert = await concertRepository.findOne({ where: { id: cData.id } });
    if (!concert) {
      concert = concertRepository.create({
        id: cData.id,
        name: cData.name,
        performanceDate: cData.performanceDate,
        location: cData.location,
        status: 'UPCOMING'
      });
      await concertRepository.save(concert);
      console.log(`Đã tạo Concert ID ${cData.id} trong Postgres.`);
    }

    const seatCount = await seatInventoryRepo.count({ where: { concert_id: cData.id } });
    if (seatCount === 0) {
      const seats = [];
      const rows = ['A', 'B'];
      const cols = 20;
      for (const row of rows) {
        for (let i = 1; i <= cols; i++) {
          seats.push({ seatNo: `${row}-${i}`, concert_id: cData.id, status: 'AVAILABLE', zone: 'SVIP' });
        }
      }
      await seatInventoryRepo.insert(seats);
      console.log(`Đã Seed 200 SVIP seats cho Concert ${cData.id} vào Postgres.`);
    }

    const zoneCount = await zoneInventoryRepo.count({ where: { concert_id: cData.id } });
    if (zoneCount === 0) {
      await zoneInventoryRepo.insert([
        { zone: 'VIP', concert_id: cData.id, totalCapacity: 75, availableSlots: 75 },
        { zone: 'Normal', concert_id: cData.id, totalCapacity: 100, availableSlots: 100 },
      ]);
      console.log(`Đã Seed 75 VIP và 100 Normal zones cho Concert ${cData.id} vào Postgres.`);
    }

    // 2. Redis Seed: SVIP Seat Matrix    // Set up Redis keys
    const inventoryKey = `concert:${cData.id}:inventory`;
    const svipHashKey = `concert:${cData.id}:svip_seats`;

    // Xoá dữ liệu cũ
    await redisClient.del(inventoryKey);
    await redisClient.del(svipHashKey);

    // Set vé GA, VIP, CAT, v.v. vào Redis
    const zones = await zoneInventoryRepo.find({ where: { concert_id: cData.id } });
    for (const zone of zones) {
      if (zone.zone !== 'SVIP') {
        await redisClient.hset(inventoryKey, zone.zone, zone.totalCapacity);
      }
    }
    console.log(`Đã nạp vé các khu vực cho Concert ${cData.id} vào Redis.`);
  }

  // Tạo CSV mẫu cho VIP Guest Import
  const csvPath = 'vip_guests.csv';
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'seatNo,name,email\nA1,Trấn Thành,tt@email.com\nA2,Sơn Tùng,mtp@email.com\n');
  }

  // 3. Import VIP Guest từ CSV vào Redis SVIP Seats
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(csvPath).pipe(csv());
    const svipHashKey1 = `concert:1:svip_seats`;
    
    stream.on('data', async (row) => {
      // Đặt sẵn vé cho khách mời (Pre-allocate) bằng cách ghi trực tiếp vào HASH
      await redisClient.hset(svipHashKey1, row.seatNo, row.email);
      console.log(`Đã Import khách VIP: Ghế ${row.seatNo} cho ${row.name}`);
    });

    stream.on('end', () => resolve(true));
    stream.on('error', (error) => reject(error));
  });

  // 4. Meilisearch Seed: Dummy shows
  const index = meiliClient.index('shows');
  const dummyShows = [
    { id: '1', name: 'Anh Trai Say Hi - Live Concert', location: 'Hà Nội', date: '2026-10-10' },
    { id: '2', name: 'Rap Việt All Star', location: 'TPHCM', date: '2026-11-20' },
    { id: '3', name: 'Đen Vâu - Show Của Đen', location: 'Đà Nẵng', date: '2026-12-05' },
    { id: '4', name: 'Anh Trai "Say Hi" 2025', location: 'Hà Nội', date: '2026-12-20' },
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
