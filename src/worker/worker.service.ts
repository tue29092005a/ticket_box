import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import { REDIS_CLIENT } from '../config/redis.config';
import { Invoice } from '../booking/entities/invoice.entity';
import { Ticket } from '../booking/entities/ticket.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';
import { IdempotencyKey } from '../payment/entities/idempotency-key.entity';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(SeatInventory) private readonly seatInventoryRepo: Repository<SeatInventory>,
    @InjectRepository(ZoneInventory) private readonly zoneInventoryRepo: Repository<ZoneInventory>,
    @InjectRepository(IdempotencyKey) private readonly idempotencyRepo: Repository<IdempotencyKey>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.warmupRedisFromDB();
    this.startRollbackWorker();
    this.startPaymentConfirmedWorker();
    this.startWebhookWorker();
    this.startEmailWorker();
    this.startLegacyDbSyncWorker();
  }

  // ─── Cache Warm-up ─────────────────────────────────────────────
  private async warmupRedisFromDB() {
    this.logger.log('Bắt đầu đồng bộ dữ liệu từ PostgreSQL lên Redis (Cache Warm-up)...');
    try {
      const tickets = await this.ticketRepo.find({ relations: ['invoice'] });
      const paidTickets = tickets.filter(t => t.invoice && t.invoice.status === 'PAID');

      const pipeline = this.redis.pipeline();
      let svipCount = 0;
      let gaCount = 0;
      const userPaidQty: Record<string, number> = {};

      for (const ticket of paidTickets) {
        const key = `user:${ticket.invoice.userId}:concert:${ticket.concert_id}:zone:${ticket.zone}`;
        userPaidQty[key] = (userPaidQty[key] || 0) + 1;

        if (ticket.zone === 'SVIP' && ticket.seatNo) {
          pipeline.hset(`concert:${ticket.concert_id}:svip_seats`, ticket.seatNo, `${ticket.invoice.userId}:PAID`);
          svipCount++;
        } else {
          gaCount++;
        }
      }

      for (const [key, qty] of Object.entries(userPaidQty)) {
        if (!key.endsWith(':svip')) {
          pipeline.set(`${key}:paid_qty`, qty.toString(), 'EX', 86400);
        }
        pipeline.set(key, qty.toString());
      }

      // Khôi phục Inventory từ ZoneInventory
      const zones = await this.zoneInventoryRepo.find();
      for (const z of zones) {
        pipeline.hset(`concert:${z.concert_id}:inventory`, z.zone, z.availableSlots.toString());
      }

      // Repair sync: Kiểm tra ghế RESERVED đã hết hạn → nhả về AVAILABLE
      const expiredSeats = await this.seatInventoryRepo
        .createQueryBuilder('seat')
        .where('seat.status = :status', { status: 'RESERVED' })
        .andWhere('seat.expiryTime < :now', { now: new Date() })
        .getMany();

      for (const seat of expiredSeats) {
        await this.seatInventoryRepo.update(
          { seatNo: seat.seatNo, concert_id: seat.concert_id, status: 'RESERVED' },
          { status: 'AVAILABLE', reservedBy: null, expiryTime: null },
        );
        pipeline.hdel(`concert:${seat.concert_id}:svip_seats`, seat.seatNo);
        this.logger.log(`[Warm-up Repair] Nhả ghế hết hạn: ${seat.seatNo}`);
      }

      await pipeline.exec();
      this.logger.log(`Đồng bộ thành công: ${svipCount} ghế SVIP, ${gaCount} vé thường, ${expiredSeats.length} ghế hết hạn đã nhả.`);
    } catch (error) {
      this.logger.error(`Lỗi khi đồng bộ Cache Warm-up: ${error.message}`);
    }
  }

  // ─── Rollback Worker (cải tiến với Payment Lock) ──────────────
  private startRollbackWorker() {
    this.rabbitChannel.consume('hold_timeout_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());

          if (data.action === 'rollback_quantity') {
            await this.handleGARollback(data);
          } else if (data.action === 'rollback_seat') {
            await this.handleSVIPRollback(data);
          }

          this.rabbitChannel.ack(msg);
        } catch (err) {
          this.logger.error(`[Rollback] Lỗi: ${err.message}`);
          this.rabbitChannel.nack(msg, false, false);
        }
      }
    });
    this.logger.log('Rollback Worker đã khởi động.');
  }

  private async handleSVIPRollback(data: any) {
    this.logger.log(`[Rollback-Debug] handleSVIPRollback called with: ${JSON.stringify(data)}`);
    const { concert_id, userId, seatNo } = data;

    // Bước 1: Kiểm tra Payment Lock — user đang thanh toán → hoãn rollback
    const paymentLock = await this.redis.get(`payment_lock:concert:${concert_id}:${seatNo}`);
    if (paymentLock) {
      this.logger.log(`[Rollback] Payment lock active cho ghế ${seatNo}. Hoãn rollback 60s.`);
      // Re-push vào wait queue với TTL 60s
      this.rabbitChannel.sendToQueue('hold_timeout_wait_5m_queue', Buffer.from(JSON.stringify(data)));
      return;
    }

    // Bước 2: Kiểm tra Redis — đã thanh toán chưa?
    const seatOwner = await this.redis.hget(`concert:${concert_id}:svip_seats`, seatNo);
    if (seatOwner === `${userId}:PAID`) {
      this.logger.log(`[Rollback] Bỏ qua: ghế ${seatNo} đã được thanh toán (Redis).`);
      return;
    }

    // Bước 3: Kiểm tra DB — phòng trường hợp Redis chưa cập nhật :PAID
    const dbSeat = await this.seatInventoryRepo.findOne({ where: { seatNo, concert_id } });
    if (!dbSeat) return;

    if (dbSeat.status === 'BOOKED') {
      // DB đã BOOKED nhưng Redis chưa cập nhật → repair sync
      this.logger.log(`[Rollback] DB đã BOOKED nhưng Redis lệch → repair sync ghế ${seatNo}`);
      await this.redis.hset(`concert:${concert_id}:svip_seats`, seatNo, `${dbSeat.reservedBy}:PAID`);
      return;
    }

    if (dbSeat.status === 'AVAILABLE') {
      // Đã được rollback bởi instance khác
      this.logger.log(`[Rollback] Ghế ${seatNo} đã AVAILABLE trong DB. Đồng bộ Redis.`);
      await this.redis.hdel(`concert:${concert_id}:svip_seats`, seatNo);
      return;
    }

    // Bước 4: DB = RESERVED và Redis chưa PAID → tiến hành rollback
    if (seatOwner === userId && dbSeat.status === 'RESERVED') {
      this.logger.log(`[Rollback] User ${userId} quá hạn. Nhả ghế ${seatNo}.`);

      const pipeline = this.redis.pipeline();
      pipeline.hdel(`concert:${concert_id}:svip_seats`, seatNo);
      pipeline.decrby(`user:${userId}:concert:${concert_id}:zone:svip`, 1);
      await pipeline.exec();

      await this.seatInventoryRepo.update(
        { seatNo, concert_id, status: 'RESERVED' },
        { status: 'AVAILABLE', reservedBy: null, expiryTime: null },
      );

      await this.redis.publish('ticketbox_sse_broadcast', JSON.stringify({
        concert_id, seatNo, status: 'available',
        message: `Ghế SVIP ${seatNo} đã được nhả.`,
      }));
    }
  }

  private async handleGARollback(data: any) {
    this.logger.log(`[Rollback-Debug] handleGARollback called with: ${JSON.stringify(data)}`);
    const { concert_id, userId, type, quantity } = data;

    // Kiểm tra Payment Lock
    const paymentLock = await this.redis.get(`payment_lock:concert:${concert_id}:zone:${type}:${userId}`);
    if (paymentLock) {
      this.logger.log(`[Rollback] Payment lock active cho vé ${type}. Hoãn rollback 60s.`);
      this.rabbitChannel.sendToQueue('hold_timeout_wait_5m_queue', Buffer.from(JSON.stringify(data)));
      return;
    }

    // Kiểm tra đã thanh toán chưa (Redis paid_qty)
    const paidQtyStr = await this.redis.get(`user:${userId}:concert:${concert_id}:zone:${type}:paid_qty`);
    if (paidQtyStr && parseInt(paidQtyStr, 10) >= quantity) {
      this.logger.log(`[Rollback] Bỏ qua: User ${userId} đã thanh toán ${quantity} vé ${type}.`);
      return;
    }

    // Kiểm tra DB fallback (phòng Redis key bị evict)
    const invoiceCount = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .innerJoin('invoice.tickets', 'ticket')
      .where('invoice.userId = :userId', { userId })
      .andWhere('invoice.concert_id = :concert_id', { concert_id })
      .andWhere('invoice.status = :status', { status: 'PAID' })
      .andWhere('ticket.zone = :zone', { zone: type })
      .getCount();

    if (invoiceCount >= quantity) {
      this.logger.log(`[Rollback] DB confirms: User ${userId} đã thanh toán vé ${type}. Skip rollback.`);
      // Repair Redis
      await this.redis.set(`user:${userId}:concert:${concert_id}:zone:${type}:paid_qty`, invoiceCount.toString(), 'EX', 86400);
      return;
    }

    // Tiến hành rollback
    this.logger.log(`[Rollback] User ${userId} quá hạn. Hoàn lại ${quantity} vé ${type}.`);
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(`concert:${concert_id}:inventory`, type, quantity);
    pipeline.incrby(`user:${userId}:concert:${concert_id}:zone:${type}`, -quantity);
    await pipeline.exec();

    await this.redis.publish('ticketbox_sse_broadcast', JSON.stringify({
      type, quantity: -quantity,
      message: `Hệ thống vừa nhả ${quantity} vé ${type} do quá hạn thanh toán.`,
    }));
  }

  // ─── Payment Confirmed Worker (tạo Invoice + gửi email) ──────
  private startPaymentConfirmedWorker() {
    this.rabbitChannel.consume('payment_confirmed_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(`[Payment Confirmed] Nhận yêu cầu tạo Invoice cho User: ${data.userId}`);

          // Idempotency check: kiểm tra Invoice đã tồn tại chưa (theo paypalOrderId)
          if (data.paypalOrderId) {
            const existingInvoice = await this.invoiceRepo.findOne({
              where: { userId: data.userId, concert_id: data.concert_id, status: 'PAID' },
              relations: ['tickets'],
            });

            // Kiểm tra xem invoice này đã tạo cho cùng paypalOrderId chưa
            if (existingInvoice) {
              const idemKey = await this.idempotencyRepo.findOne({
                where: { paypalOrderId: data.paypalOrderId, status: 'COMPLETED' },
              });
              if (idemKey) {
                this.logger.log(`[Payment Confirmed] Invoice đã tồn tại cho PayPal Order ${data.paypalOrderId}. Skip.`);
                this.rabbitChannel.ack(msg);
                return;
              }
            }
          }

          // Tạo Invoice
          const invoice = this.invoiceRepo.create({
            userId: data.userId,
            concert_id: data.concert_id,
            totalAmount: data.totalAmount,
            status: 'PAID',
          });
          const savedInvoice = await this.invoiceRepo.save(invoice);

          // Tạo Tickets
          const ticketsToSave = data.tickets.map((t: any) => {
            return this.ticketRepo.create({
              invoice: savedInvoice,
              concert_id: data.concert_id,
              seatNo: t.seatNo || null,
              zone: t.zone || null,
              price: t.price,
            });
          });
          const savedTickets = await this.ticketRepo.save(ticketsToSave);
          this.logger.log(`[Payment Confirmed] Đã lưu Invoice ${savedInvoice.id} và ${savedTickets.length} vé.`);

          // Đẩy vào email queue
          this.rabbitChannel.sendToQueue('email_notification_queue', Buffer.from(JSON.stringify({
            userId: data.userId,
            invoiceId: savedInvoice.id,
            concert_id: data.concert_id,
            tickets: savedTickets.map(t => ({ id: t.id, seatNo: t.seatNo, zone: t.zone, price: t.price })),
          })), { persistent: true });

          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Payment Confirmed] Lỗi: ${error.message}`);
          this.rabbitChannel.nack(msg, false, true); // requeue
        }
      }
    });
    this.logger.log('Payment Confirmed Worker đã khởi động.');
  }

  // ─── Webhook Worker (lưới an toàn) ───────────────────────────
  private startWebhookWorker() {
    this.rabbitChannel.consume('payment_webhook_queue', async (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          const eventType = event.event_type;
          this.logger.log(`[Webhook Worker] Nhận event: ${eventType}`);

          if (eventType === 'CHECKOUT.ORDER.APPROVED') {
            const orderId = event.resource?.id;

            if (orderId) {
              // Kiểm tra idempotency — nếu đã xử lý → skip
              const idemRecord = await this.idempotencyRepo.findOne({
                where: { paypalOrderId: orderId },
              });

              if (idemRecord && idemRecord.status === 'COMPLETED') {
                this.logger.log(`[Webhook Worker] PayPal Order ${orderId} đã được xử lý. Skip.`);
              } else {
                this.logger.log(`[Webhook Worker] PayPal Order ${orderId} chưa được capture. Đẩy vào internal_capture_queue để fallback.`);
                // Phát tín hiệu sang internal_capture_queue cho PaymentService chốt đơn
                this.rabbitChannel.sendToQueue(
                  'internal_capture_queue',
                  Buffer.from(JSON.stringify({ paypalOrderId: orderId })),
                  { persistent: true }
                );
              }
            }
          } else if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.REFUNDED') {
            this.logger.warn(`[Webhook Worker] Payment denied/refunded. Cần rollback seats.`);
            // Rollback logic nếu cần
          }

          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Webhook Worker] Lỗi: ${error.message}`);
          this.rabbitChannel.nack(msg, false, false); // DLQ
        }
      }
    });
    this.logger.log('Webhook Worker đã khởi động.');
  }

  // ─── Email Worker ─────────────────────────────────────────────
  private startEmailWorker() {
    this.rabbitChannel.consume('email_notification_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(`[Email Worker] Chuẩn bị gửi email cho Invoice: ${data.invoiceId}`);

          // Lấy email user từ DB
          const user = await this.userRepo.findOne({ where: { id: data.userId } });
          if (!user) {
            this.logger.error(`[Email Worker] Không tìm thấy user ${data.userId}`);
            this.rabbitChannel.ack(msg); // Ack để không retry mãi
            return;
          }

          // Lấy tên show (fallback)
          const showName = `Show #${data.concert_id}`;

          await this.emailService.sendTicketEmail(
            user.email,
            data.tickets,
            data.invoiceId,
            showName,
          );

          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Email Worker] Lỗi gửi email: ${error.message}`);
          // Retry — sau 3 lần thất bại sẽ vào DLQ (nếu cấu hình)
          this.rabbitChannel.nack(msg, false, true);
        }
      }
    });
    this.logger.log('Email Worker đã khởi động.');
  }

  // ─── Legacy DB Sync Worker (backward compatibility) ───────────
  private startLegacyDbSyncWorker() {
    this.rabbitChannel.consume('payment_success_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(`[Legacy DB Sync] Nhận yêu cầu từ payment_success_queue cho User: ${data.userId}`);

          // Kiểm tra Invoice đã tồn tại chưa (tránh duplicate)
          const existingInvoice = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .where('invoice.userId = :userId', { userId: data.userId })
            .andWhere('invoice.concert_id = :concert_id', { concert_id: data.concert_id })
            .andWhere('invoice.totalAmount = :amount', { amount: data.totalAmount })
            .andWhere('invoice.status = :status', { status: 'PAID' })
            .getOne();

          if (existingInvoice) {
            this.logger.log(`[Legacy DB Sync] Invoice đã tồn tại. Skip.`);
            this.rabbitChannel.ack(msg);
            return;
          }

          const invoice = this.invoiceRepo.create({
            userId: data.userId,
            concert_id: data.concert_id,
            totalAmount: data.totalAmount,
            status: 'PAID',
          });
          const savedInvoice = await this.invoiceRepo.save(invoice);

          const ticketsToSave = data.tickets.map((t: any) => {
            return this.ticketRepo.create({
              invoice: savedInvoice,
              concert_id: data.concert_id,
              seatNo: t.seatNo || null,
              zone: t.zone || null,
              price: t.price,
            });
          });
          await this.ticketRepo.save(ticketsToSave);
          this.logger.log(`[Legacy DB Sync] Đã lưu Invoice ${savedInvoice.id}.`);
          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Legacy DB Sync] Lỗi: ${error.message}`);
          this.rabbitChannel.nack(msg, false, true);
        }
      }
    });
    this.logger.log('Legacy DB Sync Worker đã khởi động.');
  }
}
