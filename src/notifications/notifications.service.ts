import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import * as QRCode from 'qrcode';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
  ) {}

  onModuleInit() {
    this.startWorkerPool();
  }

  // Worker Pooling: Khởi tạo 10 Consumer chạy song song cho hàng đợi notification
  private startWorkerPool() {
    const numWorkers = 10;
    // Prefetch giúp điều tiết tốc độ tiêu thụ (mỗi worker lấy max 5 message cùng lúc để tránh quá tải)
    this.rabbitChannel.prefetch(5); 

    for (let i = 0; i < numWorkers; i++) {
      this.rabbitChannel.consume('notification_queue', async (msg) => {
        if (msg !== null) {
          try {
            const data = JSON.parse(msg.content.toString());
            await this.processNotification(data, i);
            // Xử lý thành công -> Ack (xác nhận để xóa khỏi queue)
            this.rabbitChannel.ack(msg);
          } catch (err) {
            this.logger.error(`Worker ${i} lỗi xử lý: ${err.message}`);
            // Nack: đưa lại vào queue hoặc đẩy xuống DLQ tuỳ cấu hình (ở đây false = không requeue -> vào DLQ nếu có)
            this.rabbitChannel.nack(msg, false, false);
          }
        }
      });
    }
    this.logger.log(`Đã khởi động Worker Pool với ${numWorkers} consumer cho notification_queue.`);
  }

  private async processNotification(data: any, workerId: number) {
    if (data.type === 'BULK_REMINDER') {
      // Xử lý luồng Bulk-Notification (Batching)
      this.logger.log(`[Worker ${workerId}] Đang xử lý Bulk Message gồm ${data.batchSize} users. Chuẩn bị gọi 1 API Request duy nhất...`);
      // Giả lập 1 lệnh gọi API Batch (ví dụ SendGrid Bulk Email API)
      await new Promise(resolve => setTimeout(resolve, 500)); 
      this.logger.log(`[Worker ${workerId}] Đã GỬI THÀNH CÔNG 1 Bulk API Request chứa ${data.batchSize} email nhắc nhở.`);
      return;
    }

    // Luồng sinh e-ticket tức thì cho từng đơn hàng (Giao dịch thành công)
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data));
    this.logger.log(`[Worker ${workerId}] Đã tạo mã QR và gửi email xác nhận cho User: ${data.userId}`);
  }

  // Worker xử lý các message hết hạn 10 phút (từ hold_timeout_queue)
  private startRollbackWorker() {
    this.rabbitChannel.consume('hold_timeout_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          
          if (data.action === 'rollback_quantity') {
            const paidQtyStr = await this.redis.get(`user:${data.userId}:concert:${data.showId}:zone:${data.type}:paid_qty`);
            if (paidQtyStr && parseInt(paidQtyStr, 10) >= data.quantity) {
              this.logger.log(`[Rollback] Bỏ qua Rollback vé ${data.type} vì User ${data.userId} đã thanh toán.`);
            } else {
              this.logger.log(`[Rollback] User ${data.userId} đã quá 10 phút không thanh toán ${data.quantity} vé ${data.type}. Đang hoàn lại kho...`);
              // Hoàn lại số lượng vé VIP/Normal vào Redis và nhả User Quota
              const pipeline = this.redis.pipeline();
              pipeline.hincrby(`show:${data.showId}:inventory`, data.type, data.quantity);
              pipeline.incrby(`user:${data.userId}:concert:${data.showId}:zone:${data.type}`, -data.quantity);
              await pipeline.exec();
              
              // Bắn SSE để Frontend cộng lại số vé hiển thị (quantity gửi số âm để hàm trừ ở Frontend biến thành cộng)
              await this.redis.publish('ticketbox_sse_broadcast', JSON.stringify({
                type: data.type,
                quantity: -data.quantity,
                message: `Hệ thống vừa nhả ${data.quantity} vé ${data.type} do quá hạn thanh toán.`
              }));
            }
          } else {
            // Kiểm tra ghế trên Redis xem đã thanh toán chưa
            const seatOwner = await this.redis.hget(`show:${data.showId}:svip_seats`, data.seatNo);
            if (seatOwner === `${data.userId}:PAID`) {
              this.logger.log(`[Rollback] Bỏ qua Rollback ghế SVIP ${data.seatNo} vì User ${data.userId} đã thanh toán.`);
            } else if (seatOwner === data.userId) {
              this.logger.log(`[Rollback] User ${data.userId} đã quá 10 phút không thanh toán ghế ${data.seatNo}. Đang nhả vé...`);
              
              // Logic nhả vé: Import Redis client vào và gọi HDEL(showId:svip_seats, seatNo)
              const pipeline = this.redis.pipeline();
              pipeline.hdel(`show:${data.showId}:svip_seats`, data.seatNo);
              pipeline.decrby(`user:${data.userId}:concert:${data.showId}:zone:svip`, 1);
              await pipeline.exec();
              
              // Nhả ghế trên DB
              await this.seatInventoryRepo.update(
                { row: data.seatNo.split('-')[0], number: data.seatNo.split('-')[1], showId: data.showId, status: 'RESERVED' },
                { status: 'AVAILABLE', reservedBy: null }
              );

              await this.redis.publish('ticketbox_sse_broadcast', JSON.stringify({
                showId: data.showId,
                seatNo: data.seatNo,
                status: 'available',
                message: `Ghế SVIP ${data.seatNo} đã được nhả.`
              }));
            }
          }
          
          this.rabbitChannel.ack(msg);
        } catch (err) {
          this.rabbitChannel.nack(msg, false, false);
        }
      }
    });
  }

  // Worker đồng bộ dữ liệu vào PostgreSQL khi thanh toán thành công
  private startDatabaseSyncWorker() {
    this.rabbitChannel.consume('payment_success_queue', async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(`[Database Sync] Nhận yêu cầu lưu Hóa đơn cho User: ${data.userId}, Show: ${data.showId}`);

          // Tạo Invoice
          const invoice = this.invoiceRepository.create({
            userId: data.userId,
            showId: data.showId,
            totalAmount: data.totalAmount,
            status: 'PAID',
          });
          const savedInvoice = await this.invoiceRepository.save(invoice);

          // Tạo Tickets
          const ticketsToSave = data.tickets.map((t: any) => {
            return this.ticketRepository.create({
              invoice: savedInvoice,
              showId: data.showId,
              seatNo: t.seatNo || null,
              zone: t.zone || null,
              price: t.price,
            });
          });
          await this.ticketRepository.save(ticketsToSave);

          this.logger.log(`[Database Sync] Đã lưu thành công Hóa đơn ${savedInvoice.id} và ${ticketsToSave.length} vé vào DB.`);
          this.rabbitChannel.ack(msg);
        } catch (error) {
          this.logger.error(`[Database Sync] Lỗi khi lưu DB: ${error.message}`);
          // Nếu lỗi do DB sập, có thể nack để queue lại (requeue = true)
          this.rabbitChannel.nack(msg, false, true); 
        }
      }
    });
  }
}
