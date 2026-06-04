import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import Redis from 'ioredis';
import * as amqp from 'amqplib';
import NodeCache from 'node-cache';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  private amqpChannel: amqp.Channel;
  private isRedisDown = false;
  
  // Biến cấu hình cho Circuit Breaker và Graceful Degradation
  private circuitBreakerTimeout: NodeJS.Timeout;
  private fallbackTTL = 10; // 10s TTL local cache khi Redis down

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('LOCAL_CACHE') private readonly localCache: NodeCache,
    @Inject('AMQP_CONNECTION') private readonly amqpConnection: amqp.ChannelModel,
  ) {
    this.initAmqp();
    this.initRedisCircuitBreaker();
  }

  // Khởi tạo kênh RabbitMQ
  private async initAmqp() {
    try {
      this.amqpChannel = await this.amqpConnection.createChannel();
      await this.amqpChannel.assertQueue('order_queue', { durable: true });
    } catch (err) {
      this.logger.error('Lỗi khởi tạo kênh RabbitMQ:', err.message);
    }
  }

  // Khởi tạo Circuit Breaker cơ bản cho Redis
  private initRedisCircuitBreaker() {
    this.redis.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis: ${err.message}`);
      if (!this.isRedisDown) {
        this.isRedisDown = true;
        this.logger.warn('⚠️ Circuit Breaker [MỞ]: Kích hoạt chế độ Fallback DB & Nâng TTL Local Cache lên 10s');
      }
    });

    this.redis.on('connect', () => {
      if (this.isRedisDown) {
        this.isRedisDown = false;
        this.logger.log('💚 Circuit Breaker [ĐÓNG]: Khôi phục hoạt động bình thường của Redis');
      }
    });
  }

  /**
   * Đặt vé sử dụng Kỹ thuật Trừ Kho Nghịch Đảo (Inverse Atomic Counter)
   * chống race-condition không cần dùng Lua script
   */
  async reserveTicket(
    userId: string,
    concertId: string,
    zoneId: string,
    quantity: number,
    idempotencyKey: string,
  ): Promise<{ success: boolean; message: string }> {
    
    // Nếu Redis sập -> Kích hoạt Circuit Breaker, đọc/ghi DB (Bypass sang DB Fallback)
    if (this.isRedisDown) {
      return this.reserveTicketDBFallback(userId, concertId, zoneId, quantity, idempotencyKey);
    }

    const ticketKey = `cache:concert:${concertId}:tickets`;
    const userLimitKey = `limit:user:${userId}:concert:${concertId}`;
    const maxPerUser = 4; // Quy định tối đa 4 vé mỗi User

    try {
      // BƯỚC 1: Kiểm tra chống trùng lặp giao dịch (Idempotency)
      const setNxResult = await this.redis.set(idempotencyKey, 'PENDING', 'EX', 600, 'NX');
      if (!setNxResult) {
        throw new BadRequestException('Yêu cầu đặt vé này đang được xử lý hoặc đã trùng lặp.');
      }

      // BƯỚC 2: Kiểm tra và tăng giới hạn mua của User
      const currentUserTotal = await this.redis.incrby(userLimitKey, quantity);
      if (currentUserTotal > maxPerUser) {
        // HOÀN TÁC (Rollback): Trừ lại số lượng đã cộng lố và xóa idempotencyKey
        await this.redis.incrby(userLimitKey, -quantity);
        await this.redis.del(idempotencyKey);
        throw new BadRequestException(`Giao dịch thất bại! Bạn đã vượt quá giới hạn đặt vé tối đa (${maxPerUser} vé).`);
      }

      // BƯỚC 3: Trừ số lượng vé trên RAM Redis (Kỹ thuật Trừ Kho Nghịch Đảo)
      const remainingTickets = await this.redis.hincrby(ticketKey, zoneId, -quantity);

      // BƯỚC 4: Kiểm tra tồn kho sau khi trừ
      if (remainingTickets < 0) {
        // HOÀN TÁC (Rollback): Cộng trả lại kho vé, trừ lại giới hạn mua user và xóa idempotencyKey
        await this.redis.hincrby(ticketKey, zoneId, quantity);
        await this.redis.incrby(userLimitKey, -quantity);
        await this.redis.del(idempotencyKey);
        throw new BadRequestException('Vé tại khu vực bạn chọn đã hết.');
      }

      // BƯỚC 5: Hợp lệ -> Đẩy message vào hàng đợi RabbitMQ để Worker cập nhật Postgres bất đồng bộ
      const payload = { userId, concertId, zoneId, quantity, idempotencyKey, timestamp: Date.now() };
      
      this.amqpChannel.sendToQueue(
        'order_queue',
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );

      this.logger.log(`[Success] Giữ chỗ thành công, gửi vào RabbitMQ: ${idempotencyKey}`);
      return { success: true, message: 'Yêu cầu của bạn đang được xử lý.' };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Lỗi khi đặt vé qua Redis, kích hoạt Circuit Breaker...', error.message);
      this.isRedisDown = true;
      return this.reserveTicketDBFallback(userId, concertId, zoneId, quantity, idempotencyKey);
    }
  }

  /**
   * Kịch bản xử lý lỗi (Graceful Degradation): Bypass sang DB khi Redis sập
   */
  private async reserveTicketDBFallback(
    userId: string,
    concertId: string,
    zoneId: string,
    quantity: number,
    idempotencyKey: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.warn(`[Fallback DB] Đang xử lý bypass qua DB cho đơn hàng: ${idempotencyKey}`);
    
    // Nâng TTL của local cache lên 10s để giảm tải cho DB trong thời gian Redis down
    const localKey = `local:concert:${concertId}:tickets`;
    const cachedData = this.localCache.get(localKey);
    if (!cachedData) {
      // Giả lập đọc DB trực tiếp lấy thông tin nạp vào local cache trong 10s
      this.localCache.set(localKey, { [zoneId]: 100 }, this.fallbackTTL);
    }

    // Đẩy message thẳng vào RabbitMQ để Worker xử lý trực tiếp vào DB
    const payload = { userId, concertId, zoneId, quantity, idempotencyKey, timestamp: Date.now(), fallback: true };
    this.amqpChannel.sendToQueue(
      'order_queue',
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    return { success: true, message: 'Hệ thống bận, đơn hàng đang được xử lý (Chế độ Dự phòng).' };
  }
}
