import { Injectable, Inject, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import * as amqp from 'amqplib';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../config/redis.config';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import { PaypalClient } from './paypal.client';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';
import { SseService } from '../booking/sse.service';

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private readonly VND_TO_USD_RATE = parseInt(process.env.VND_TO_USD_RATE || '25000', 10);
  private readonly PAYMENT_LOCK_TTL = 180; // 3 phút

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
    @InjectRepository(IdempotencyKey) private readonly idempotencyRepo: Repository<IdempotencyKey>,
    @InjectRepository(SeatInventory) private readonly seatInventoryRepo: Repository<SeatInventory>,
    @InjectRepository(ZoneInventory) private readonly zoneInventoryRepo: Repository<ZoneInventory>,
    private readonly paypalClient: PaypalClient,
    private readonly sseService: SseService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.startInternalCaptureWorker();
  }

  private startInternalCaptureWorker() {
    this.rabbitChannel.consume('internal_capture_queue', async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          const { paypalOrderId } = payload;
          this.logger.log(`[Internal Capture] Nhận tín hiệu xử lý fallback cho order: ${paypalOrderId}`);

          // Tìm IdempotencyKey liên quan đến order này
          const idemRecord = await this.idempotencyRepo.findOne({ where: { paypalOrderId } });
          if (!idemRecord) {
            this.logger.warn(`[Internal Capture] Không tìm thấy IdempotencyKey cho order: ${paypalOrderId}. Cần can thiệp tay.`);
            this.rabbitChannel.ack(msg);
            return;
          }

          if (idemRecord.status === 'COMPLETED') {
            this.logger.log(`[Internal Capture] Order ${paypalOrderId} đã được Frontend capture thành công. Webhook bỏ qua.`);
            this.rabbitChannel.ack(msg);
            return;
          }

          const reqPayload = idemRecord.requestPayload;
          if (!reqPayload) {
            this.logger.error(`[Internal Capture] Thiếu requestPayload trong DB cho order: ${paypalOrderId}`);
            this.rabbitChannel.ack(msg);
            return;
          }

          // Gọi hàm capture chính để xử lý DB transaction và gửi email
          await this.captureOrder(
            idemRecord.userId,
            paypalOrderId,
            idemRecord.key,
            idemRecord.concert_id,
            reqPayload.svipSeats || [],
            reqPayload.ticketCounts || {},
            reqPayload.totalAmountVND
          );

          this.logger.log(`[Internal Capture] Fallback capture thành công cho order: ${paypalOrderId}`);
          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Internal Capture] Lỗi xử lý fallback capture: ${error.message}`);
          this.rabbitChannel.nack(msg, false, false); // Đẩy vào DLQ hoặc retry
        }
      }
    });
  }

  /**
   * Kiểm tra Idempotency Key — 3 lớp: Redis → DB UNIQUE → Atomic INSERT
   * Trả về: { isNew: true } nếu key mới, hoặc { isNew: false, existing: IdempotencyKey } nếu key đã tồn tại.
   */
  private async checkIdempotency(key: string, userId: string, concert_id: number, requestPayload?: any): Promise<{ isNew: boolean; existing?: IdempotencyKey }> {
    // Lớp 1: Redis fast-path
    const redisResult = await this.redis.get(`idem:${key}`);
    if (redisResult) {
      const existing = await this.idempotencyRepo.findOne({ where: { key } });
      if (existing) {
        return { isNew: false, existing };
      }
    }

    // Lớp 2 + 3: Atomic INSERT ... ON CONFLICT DO NOTHING
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(IdempotencyKey)
        .values({
          key,
          userId,
          concert_id,
          requestPayload,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .orIgnore() // ON CONFLICT DO NOTHING
        .execute();

      if (result.identifiers.length > 0 && result.identifiers[0].id) {
        // INSERT thành công — key mới
        await this.redis.set(`idem:${key}`, 'PENDING', 'EX', 86400);
        return { isNew: true };
      }
    } catch (err) {
      // Unique violation fallback (một số driver không support orIgnore)
      if (err.code === '23505') {
        this.logger.debug(`Idempotency key collision caught by DB UNIQUE: ${key}`);
      } else {
        throw err;
      }
    }

    // Key đã tồn tại — query response cũ
    const existing = await this.idempotencyRepo.findOne({ where: { key } });
    if (existing) {
      return { isNew: false, existing };
    }

    throw new BadRequestException('Lỗi xử lý idempotency key.');
  }

  /**
   * Tạo PayPal Order
   */
  async createOrder(
    userId: string,
    concert_id: number,
    svipSeats: string[],
    ticketCounts: Record<string, number>,
    totalAmountVND: number,
    idempotencyKey: string,
  ) {
    const requestPayload = { svipSeats, ticketCounts, totalAmountVND };
    
    // 1. Kiểm tra idempotency
    const { isNew, existing } = await this.checkIdempotency(idempotencyKey, userId, concert_id, requestPayload);
    if (!isNew && existing) {
      if (existing.status === 'COMPLETED') {
        return existing.responsePayload;
      }
      if (existing.paypalOrderId) {
        // Đã tạo order trước đó nhưng chưa capture — trả lại order ID cũ
        return { orderId: existing.paypalOrderId, status: 'PENDING' };
      }
    }

    // 2. Đặt Payment Lock cho từng ghế SVIP
    for (const seatNo of svipSeats) {
      await this.redis.set(
        `payment_lock:concert:${concert_id}:${seatNo}`,
        userId,
        'EX',
        this.PAYMENT_LOCK_TTL,
      );
    }

    // Payment lock cho GA zones
    for (const [zone, count] of Object.entries(ticketCounts)) {
      if (count > 0) {
        await this.redis.set(
          `payment_lock:concert:${concert_id}:zone:${zone}:${userId}`,
          count.toString(),
          'EX',
          this.PAYMENT_LOCK_TTL,
        );
      }
    }

    // 3. Quy đổi VND → USD
    const amountUSD = (totalAmountVND / this.VND_TO_USD_RATE).toFixed(2);
    const referenceId = `${concert_id}-${userId}-${Date.now()}`;

    // 4. Gọi PayPal API tạo Order
    const paypalOrder = await this.paypalClient.createOrder(
      amountUSD,
      referenceId,
      `TicketBox - Show ${concert_id}`,
    );

    // 5. Cập nhật idempotency key với PayPal Order ID
    await this.idempotencyRepo.update(
      { key: idempotencyKey },
      { paypalOrderId: paypalOrder.id },
    );

    const response = { orderId: paypalOrder.id, status: 'CREATED' };
    return response;
  }

  /**
   * Capture (chốt) thanh toán PayPal — Đây là bước quan trọng nhất
   */
  async captureOrder(
    userId: string,
    paypalOrderId: string,
    idempotencyKey: string,
    concert_id: number,
    svipSeats: string[],
    ticketCounts: Record<string, number>,
    totalAmountVND: number,
  ) {
    // 1. Kiểm tra idempotency — nếu đã COMPLETED → trả response cũ
    const idemRecord = await this.idempotencyRepo.findOne({ where: { key: idempotencyKey } });
    if (idemRecord && idemRecord.status === 'COMPLETED') {
      this.logger.log(`[Idempotency] Duplicate capture request for key: ${idempotencyKey}, returning cached response`);
      return idemRecord.responsePayload;
    }

    // 2. Gọi PayPal Capture API
    this.logger.log(`[Capture] Đang gửi lệnh trừ tiền xuống PayPal cho Order ID: ${paypalOrderId}...`);
    const captureResult = await this.paypalClient.captureOrder(paypalOrderId);

    if (captureResult.status !== 'COMPLETED') {
      this.logger.warn(`[Capture] PayPal từ chối trừ tiền cho Order ID: ${paypalOrderId}. Status: ${captureResult.status}`);
      await this.idempotencyRepo.update({ key: idempotencyKey }, { status: 'FAILED' });
      await this.redis.set(`idem:${idempotencyKey}`, 'FAILED', 'EX', 86400);
      throw new BadRequestException(`PayPal payment not completed. Status: ${captureResult.status}`);
    }

    this.logger.log(`[Capture] Trừ tiền PayPal THÀNH CÔNG cho Order ID: ${paypalOrderId}`);

    // 3. Atomic DB Update trong Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tickets: any[] = [];

      // Chốt ghế SVIP → BOOKED
      for (const seatNo of svipSeats) {
        const dbUpdate = await queryRunner.manager.update(
          SeatInventory,
          { seatNo, concert_id, reservedBy: userId },
          { status: 'BOOKED' },
        );

        if (dbUpdate.affected === 0) {
          // Có thể ghế đã bị rollback worker nhả — thử acquire lại nếu ghế vẫn AVAILABLE
          const fallbackUpdate = await queryRunner.manager.update(
            SeatInventory,
            { seatNo, concert_id, status: 'AVAILABLE' },
            { status: 'BOOKED', reservedBy: userId },
          );
          if (fallbackUpdate.affected === 0) {
            this.logger.error(`[Capture] Ghế ${seatNo} đã bị người khác đặt. PayPal đã capture, cần xử lý hoàn tiền.`);
            // Trong production: trigger refund flow. Trong demo: log warning
          }
        }

        // Lấy giá từ ZoneInventory
        const zoneInfo = await queryRunner.manager.findOne(ZoneInventory, { where: { zone: 'SVIP', concert_id } });
        tickets.push({ seatNo, zone: 'SVIP', price: zoneInfo?.price || 2650000 });
      }

      // Chốt vé GA zones
      for (const [zone, count] of Object.entries(ticketCounts)) {
        const quantity = count as number;
        if (quantity > 0) {
          const zoneUpdate = await queryRunner.manager
            .createQueryBuilder()
            .update(ZoneInventory)
            .set({ availableSlots: () => `"availableSlots" - ${quantity}` })
            .where('"zone" = :zone AND "concert_id" = :concert_id AND "availableSlots" >= :count', {
              zone, concert_id, count: quantity,
            })
            .execute();

          if (zoneUpdate.affected === 0) {
            this.logger.error(`[Capture] Vé ${zone} đã hết. PayPal đã capture, cần xử lý hoàn tiền.`);
          }

          const zoneInfo = await queryRunner.manager.findOne(ZoneInventory, { where: { zone, concert_id } });
          for (let i = 0; i < quantity; i++) {
            tickets.push({ zone, price: zoneInfo?.price || 0 });
          }
        }
      }

      // Cập nhật idempotency key → COMPLETED
      const responsePayload = {
        success: true,
        message: 'Thanh toán thành công',
        paypalOrderId,
        tickets,
      };
      await queryRunner.manager.update(
        IdempotencyKey,
        { key: idempotencyKey },
        { status: 'COMPLETED', responsePayload: responsePayload as any },
      );

      await queryRunner.commitTransaction();

      // 4. Cập nhật Redis (sau khi DB commit thành công)
      const pipeline = this.redis.pipeline();
      for (const seatNo of svipSeats) {
        pipeline.hset(`concert:${concert_id}:svip_seats`, seatNo, `${userId}:PAID`);
        pipeline.del(`payment_lock:concert:${concert_id}:${seatNo}`);
      }
      for (const [zone, count] of Object.entries(ticketCounts)) {
        if ((count as number) > 0) {
          pipeline.del(`payment_lock:concert:${concert_id}:zone:${zone}:${userId}`);
          pipeline.set(`user:${userId}:concert:${concert_id}:zone:${zone}:paid_qty`, (count as number).toString(), 'EX', 86400);
        }
      }
      pipeline.set(`idem:${idempotencyKey}`, 'COMPLETED', 'EX', 86400);
      await pipeline.exec();

      // 5. SSE broadcast ghế đã thanh toán
      for (const seatNo of svipSeats) {
        await this.sseService.broadcast({
          concert_id, seatNo, status: 'booked', userId,
          message: `Ghế SVIP ${seatNo} đã được thanh toán.`,
        });
      }

      // 6. Đẩy vào RabbitMQ để Worker tạo Invoice + gửi email bất đồng bộ
      const confirmedPayload = {
        userId,
        concert_id,
        paypalOrderId,
        idempotencyKey,
        totalAmount: totalAmountVND,
        tickets,
      };
      this.rabbitChannel.sendToQueue(
        'payment_confirmed_queue',
        Buffer.from(JSON.stringify(confirmedPayload)),
        { persistent: true },
      );

      return responsePayload;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Capture] Transaction failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xử lý Webhook từ PayPal — đẩy vào RabbitMQ thay vì xử lý trực tiếp
   */
  async handleWebhook(headers: Record<string, string>, rawBody: string) {
    // Verify chữ ký webhook
    const isValid = await this.paypalClient.verifyWebhookSignature(headers, rawBody);
    if (!isValid) {
      this.logger.warn('[Webhook] Invalid PayPal webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Đẩy nguyên event vào RabbitMQ (durable queue)
    this.rabbitChannel.sendToQueue(
      'payment_webhook_queue',
      Buffer.from(rawBody),
      { persistent: true },
    );

    this.logger.log('[Webhook] PayPal webhook event queued for processing');
    return { received: true };
  }

  /**
   * Kiểm tra user có đơn hàng pending không (back-button protection)
   */
  async getPendingOrder(userId: string, concert_id: number) {
    const pending = await this.idempotencyRepo.findOne({
      where: { userId, concert_id, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });

    if (pending && pending.paypalOrderId) {
      return {
        hasPending: true,
        paypalOrderId: pending.paypalOrderId,
        idempotencyKey: pending.key,
      };
    }

    return { hasPending: false };
  }

  /**
   * Lấy PayPal Client ID cho frontend
   */
  getConfig() {
    return {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      mode: process.env.PAYPAL_MODE || 'sandbox',
    };
  }
}
