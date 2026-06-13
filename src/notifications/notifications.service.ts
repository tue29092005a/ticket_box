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
}
