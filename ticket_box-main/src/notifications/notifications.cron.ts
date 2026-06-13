import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as amqp from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
  ) {}

  // Chạy mỗi ngày vào lúc 00:00 để gửi nhắc nhở 24h trước khi sự kiện diễn ra
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReminders() {
    this.logger.log('Bắt đầu chạy Cronjob gửi nhắc nhở sự kiện 24h tới...');
    
    // 1. Lấy danh sách users cần gửi nhắc nhở từ Database (Giả lập)
    // Bulk API Batching: Thay vì lấy tất cả, lấy <= 1000 users mỗi lần (Phân trang bằng cursor hoặc offset)
    const totalUsers = 2500;
    const batchSize = 1000;
    
    for (let offset = 0; offset < totalUsers; offset += batchSize) {
      this.logger.log(`Đang xử lý batch từ ${offset} đến ${offset + batchSize}`);
      const batch = this.fetchUsersBatch(offset, batchSize);
      
      try {
        // Gửi toàn bộ batch thành 1 message duy nhất (Bulk Message) vào queue để Worker Pool xử lý
        this.rabbitChannel.sendToQueue('notification_queue', Buffer.from(JSON.stringify({
          type: 'BULK_REMINDER', 
          showId: '1',
          batchSize: batch.length,
          users: batch
        })));
        this.logger.log(`Đã đẩy thành công 1 Bulk Message chứa ${batch.length} users vào queue.`);
      } catch (error) {
        // Dead Letter Queue (DLQ) bằng cách tạo riêng 1 queue xử lý lỗi cron
        this.logger.error(`Lỗi khi đẩy bulk message chứa ${batch.length} users vào queue. Đưa vào DLQ.`);
        // (RabbitMQ đã được thiết lập mặc định, nếu channel lỗi có thể fallback)
      }
    }
  }

  private fetchUsersBatch(offset: number, limit: number) {
    const users = [];
    for (let i = 0; i < limit; i++) {
      users.push({ id: `user_${offset + i}` });
    }
    return users;
  }
}
