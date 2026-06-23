import { Injectable, Inject, BadRequestException, Logger, forwardRef, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import NodeCache from 'node-cache';
import * as amqp from 'amqplib';
import { REDIS_CLIENT } from '../config/redis.config';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import { SseService } from './sse.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatInventory } from './entities/seat-inventory.entity';
import { ZoneInventory } from './entities/zone-inventory.entity';

@Injectable()
export class BookingService implements OnModuleInit {
  private readonly logger = new Logger(BookingService.name);
  private seatCache = new NodeCache({ stdTTL: 60 });
  private activePromises = new Map<string, Promise<any>>(); // SingleFlight pattern

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
    @Inject(forwardRef(() => SseService)) private readonly sseService: SseService,
    @InjectRepository(SeatInventory) private readonly seatInventoryRepo: Repository<SeatInventory>,
    @InjectRepository(ZoneInventory) private readonly zoneInventoryRepo: Repository<ZoneInventory>,
  ) {}

  async onModuleInit() {
    this.logger.log('Seeding SVIP seats into database if not exists...');
    const count = await this.seatInventoryRepo.count();
    if (count === 0) {
      const seats = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']; // 10 rows
      const cols = 20; // 20 columns = 200 seats
      for (const row of rows) {
        for (let i = 1; i <= cols; i++) {
          seats.push({ row, number: String(i), showId: '11111111-1111-1111-1111-111111111111', status: 'AVAILABLE', zone: 'SVIP' });
        }
      }
      await this.seatInventoryRepo.insert(seats);
      this.logger.log('Seeded 200 SVIP seats successfully.');

      // Pre-allocate A-1 and A-2 to 'sponsor-test' for VIP CSV import testing.
      // In production, this is done by an admin via a seat-allocation API (post-MVP).
      await this.seatInventoryRepo.update(
        { row: 'A', number: '1', showId: '11111111-1111-1111-1111-111111111111' },
        { sponsorId: 'sponsor-test' },
      );
      await this.seatInventoryRepo.update(
        { row: 'A', number: '2', showId: '11111111-1111-1111-1111-111111111111' },
        { sponsorId: 'sponsor-test' },
      );
      this.logger.log('Seeded sponsorId=sponsor-test on seats A-1 and A-2.');
    }

    this.logger.log('Seeding ZoneInventory into database if not exists...');
    const zoneCount = await this.zoneInventoryRepo.count();
    if (zoneCount === 0) {
      await this.zoneInventoryRepo.insert([
        { zone: 'VIP', showId: '11111111-1111-1111-1111-111111111111', totalCapacity: 75, availableSlots: 75 },
        { zone: 'Normal', showId: '11111111-1111-1111-1111-111111111111', totalCapacity: 100, availableSlots: 100 },
      ]);
      this.logger.log('Seeded 75 VIP and 100 Normal zones successfully.');
    }
  }

  // Lấy trạng thái tất cả ghế SVIP
  async getSeatStatus(showId: string) {
    const seatHashKey = `show:${showId}:svip_seats`;
    let seats = this.seatCache.get(seatHashKey);
    if (!seats) {
      seats = await this.redis.hgetall(seatHashKey);
      this.seatCache.set(seatHashKey, seats);
    }
    return seats;
  }

  // Lấy lượng vé còn lại của tất cả các zone
  async getInventory(showId: string) {
    const inventoryKey = `show:${showId}:inventory`;
    const inventory = await this.redis.hgetall(inventoryKey);
    const parsed: Record<string, number> = {};
    for (const [key, val] of Object.entries(inventory)) {
      parsed[key] = parseInt(val, 10);
    }
    return parsed;
  }

  updateLocalSeatCache(payload: any) {
    if (payload.showId && payload.seatNo && payload.status) {
      const seatHashKey = `show:${payload.showId}:svip_seats`;
      let seats: any = this.seatCache.get(seatHashKey);
      if (seats) {
        if (payload.status === 'held' || payload.status === 'booked') {
          seats[payload.seatNo] = payload.userId || 'held';
        } else if (payload.status === 'available') {
          delete seats[payload.seatNo];
        }
        this.seatCache.set(seatHashKey, seats);
      }
    }
  }

  // Đặt vé General Admission (GA) sử dụng HINCRBY
  async bookGATicket(showId: string, userId: string, quantity: number, zoneType: string = 'Normal') {
    const inventoryKey = `show:${showId}:inventory`;
    
    // Khởi tạo quota ban đầu nếu chưa tồn tại trong Redis
    const exists = await this.redis.hexists(inventoryKey, zoneType);
    if (!exists) {
      const zoneInfo = await this.zoneInventoryRepo.findOne({ where: { zone: zoneType, showId } });
      if (!zoneInfo) throw new BadRequestException(`Zone ${zoneType} không tồn tại.`);
      await this.redis.hsetnx(inventoryKey, zoneType, zoneInfo.availableSlots);
    }

    // Kiểm tra giới hạn số lượng vé mỗi tài khoản (Per-User Quota)
    const userQuotaKey = `user:${userId}:concert:${showId}:zone:${zoneType}`;
    const maxQuota = 4; // Giới hạn chung là 4 vé cho mỗi zone GA
    
    const currentUserQuota = await this.redis.incrby(userQuotaKey, quantity);
    if (currentUserQuota > maxQuota) {
      await this.redis.incrby(userQuotaKey, -quantity);
      throw new BadRequestException(`Tài khoản chỉ được mua tối đa ${maxQuota} vé ${zoneType}.`);
    }

    // Sử dụng HINCRBY số âm để trừ số lượng vé một cách atomic
    const remaining = await this.redis.hincrby(inventoryKey, zoneType, -quantity);
    
    if (remaining < 0) {
      // Nếu số lượng âm tức là hết vé, cần rollback lại số vé và rollback lại Quota của user
      await this.redis.hincrby(inventoryKey, zoneType, quantity);
      await this.redis.incrby(userQuotaKey, -quantity);
      throw new BadRequestException(`Vé ${zoneType} đã bán hết.`);
    }

    // Gửi thông báo đến toàn bộ người dùng qua SSE sau khi giữ vé thành công
    this.sseService.broadcast({ message: `Vé ${zoneType} vừa được giữ`, quantity, type: zoneType });

    // Đẩy message vào RabbitMQ để gửi notification bất đồng bộ
    this.rabbitChannel.sendToQueue('notification_queue', Buffer.from(JSON.stringify({
      userId, showId, type: zoneType, quantity
    })));

    // Đẩy vào RabbitMQ Wait Queue để tự động hoàn trả số lượng (Rollback) nếu không thanh toán sau 10 phút
    const rollbackPayload = JSON.stringify({ showId, userId, type: zoneType, quantity, action: 'rollback_quantity' });
    this.rabbitChannel.sendToQueue('hold_timeout_wait_queue', Buffer.from(rollbackPayload), {
      expiration: '20000' // TTL = 20 giây (20,000 ms)
    });

    return { success: true, remaining };
  }

  // Đặt ghế SVIP cụ thể sử dụng HSETNX để tránh trùng ghế
  async bookSVIPTicket(showId: string, userId: string, seatNo: string) {
    const seatHashKey = `show:${showId}:svip_seats`;
    const maxSvipSeats = 200;

    // 1. Kiểm tra số lượng ghế đã bán (HLEN)
    const soldSeatsCount = await this.redis.hlen(seatHashKey);
    if (soldSeatsCount >= maxSvipSeats) {
      throw new BadRequestException('Đã hết ghế SVIP.');
    }

    // Kiểm tra giới hạn số lượng vé SVIP mỗi tài khoản (Per-User Quota)
    const userQuotaKey = `user:${userId}:concert:${showId}:zone:svip`;
    const maxSvipPerUser = 2; // SVIP tối đa 2 vé/tài khoản

    const currentUserQuota = await this.redis.incr(userQuotaKey);
    if (currentUserQuota > maxSvipPerUser) {
      await this.redis.decr(userQuotaKey);
      throw new BadRequestException(`Tài khoản chỉ được mua tối đa ${maxSvipPerUser} vé SVIP.`);
    }

    // 2. Atomic Lock cho ghế cụ thể sử dụng HSETNX
    // Nếu ghế đã có chủ (HSETNX trả về 0), báo lỗi ngay.
    // Nếu chưa, gán cho userId hiện tại (trả về 1).
    const isAcquired = await this.redis.hsetnx(seatHashKey, seatNo, userId);
    if (!isAcquired) {
      await this.redis.decr(userQuotaKey); // Rollback quota nếu giành ghế thất bại
      throw new BadRequestException('Ghế này đã có người đặt trên Redis.');
    }

    // 2.5 DB Sync Write: Cập nhật Database đồng bộ để chặn Data Loss
    const dbUpdate = await this.seatInventoryRepo.update(
      { row: seatNo.split('-')[0], number: seatNo.split('-')[1], showId, status: 'AVAILABLE' },
      { status: 'RESERVED', reservedBy: userId, expiryTime: new Date(Date.now() + 10 * 60 * 1000) } // 10 mins
    );

    if (dbUpdate.affected === 0) {
      // Rollback Redis vì DB báo ghế đã có người đặt
      await this.redis.hdel(seatHashKey, seatNo);
      await this.redis.decr(userQuotaKey);
      throw new BadRequestException('Thao tác không hợp lệ, ghế đã được đặt theo Database.');
    }

    // Gửi event broadcast cho tất cả client để cập nhật ghế trên sơ đồ thành màu tím (held)
    this.sseService.broadcast({ showId, seatNo, status: 'held', userId, message: `Ghế SVIP ${seatNo} đang được giữ.` });
    
    // Gửi thông báo riêng tư cho người vừa đặt (Opt-in)
    this.sseService.notifyClient(userId, { type: 'message', message: `Giữ ghế SVIP ${seatNo} thành công, vui lòng thanh toán trong 10 phút.` });

    // 3. Đẩy vào RabbitMQ Wait Queue (Delayed Message giả lập qua TTL + DLX)
    // Nếu người dùng không thanh toán sau 10 phút, message này sẽ rớt sang DLQ và tiến hành Rollback
    const payload = JSON.stringify({ showId, userId, seatNo, action: 'rollback_seat' });
    this.rabbitChannel.sendToQueue('hold_timeout_wait_queue', Buffer.from(payload), {
      expiration: '20000' // TTL = 20 giây (20,000 ms)
    });

    return { success: true, seatNo };
  }

  // API Mô phỏng thanh toán
  async payTickets(showId: string, userId: string, payload: any) {
    const { svipSeats, ticketCounts = {}, totalAmount } = payload;
    
    const tickets = [];

    // Chốt ghế SVIP
    if (svipSeats && svipSeats.length > 0) {
      const seatHashKey = `show:${showId}:svip_seats`;
      for (const seatNo of svipSeats) {
        // Chỉ để chắc chắn người này thực sự đang giữ ghế trên Redis
        const owner = await this.redis.hget(seatHashKey, seatNo);
        if (owner === userId || owner === `${userId}:PAID`) {
          
          // Double Check trên Database để chốt giao dịch
          const dbUpdate = await this.seatInventoryRepo.update(
            { row: seatNo.split('-')[0], number: seatNo.split('-')[1], showId, reservedBy: userId, status: 'RESERVED' },
            { status: 'BOOKED' }
          );

          if (dbUpdate.affected > 0) {
            tickets.push({ seatNo, zone: 'SVIP', price: 2650000 });
            await this.redis.hset(seatHashKey, seatNo, `${userId}:PAID`);
            // Cập nhật trạng thái SSE thành booked
            this.sseService.broadcast({ showId, seatNo, status: 'booked', userId, message: `Ghế SVIP ${seatNo} đã được thanh toán.` });
            this.updateLocalSeatCache({ showId, seatNo, status: 'booked', userId });
          } else {
            // Lỗi lệch pha hoặc giao dịch hết hạn (DB đã nhả)
            if (tickets.length === 0) {
              throw new BadRequestException(`Ghế SVIP ${seatNo} của bạn đã bị Database thu hồi hoặc thuộc về người khác.`);
            }
          }
        }
      }
    }

    // Chốt vé các Zone linh động
    for (const [zone, count] of Object.entries(ticketCounts)) {
      const quantity = count as number;
      if (quantity > 0) {
        // Lấy giá từ DB để push vào mảng tickets, thay vì hardcode
        const zoneInfo = await this.zoneInventoryRepo.findOne({ where: { zone, showId } });
        const price = zoneInfo ? zoneInfo.price : 0;

        const dbUpdate = await this.zoneInventoryRepo.createQueryBuilder()
          .update(ZoneInventory)
          .set({ availableSlots: () => `availableSlots - ${quantity}` })
          .where('zone = :zone AND showId = :showId AND availableSlots >= :count', {
            zone, showId, count: quantity
          })
          .execute();

        if (dbUpdate.affected === 0) {
          throw new BadRequestException(`Rất tiếc, vé ${zone} đã được bán hết do biến động hệ thống.`);
        }

        await this.redis.set(`user:${userId}:concert:${showId}:zone:${zone}:paid_qty`, quantity.toString(), 'EX', 86400);
        for (let i = 0; i < quantity; i++) tickets.push({ zone, price });
      }
    }

    // Gửi event để Worker lưu Database
    const syncPayload = {
      userId,
      showId,
      totalAmount,
      tickets,
    };

    this.rabbitChannel.sendToQueue('payment_success_queue', Buffer.from(JSON.stringify(syncPayload)));

    // Xóa các wait_queue jobs (Trong thực tế cần ID để xóa hoặc xử lý logic idempotent ở DB/Rollback)
    // Ở đây đơn giản mô phỏng đã thanh toán.
    
    return { success: true, message: 'Thanh toán thành công' };
  }
}
