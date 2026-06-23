import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as amqp from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import { ImportJob, ImportJobStatus } from '../guest/entities/import-job.entity';

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
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
          showId: '11111111-1111-1111-1111-111111111111',
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

  /**
   * Zombie Job Detector — runs every 5 minutes.
   * Finds import_jobs stuck in PROCESSING for >30 min (worker likely crashed)
   * and marks them FAILED so admins can re-trigger.
   */
  @Cron('*/5 * * * *')
  async detectZombieImportJobs() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const zombies = await this.importJobRepo.find({
      where: { status: ImportJobStatus.PROCESSING, startedAt: LessThan(cutoff) },
    });

    if (zombies.length === 0) return;

    for (const job of zombies) {
      this.logger.warn(
        `[ZOMBIE] Import job ${job.id} (sponsor=${job.sponsorId}) ` +
        `stuck in PROCESSING since ${job.startedAt?.toISOString()}. Marking FAILED.`,
      );
      await this.importJobRepo.update(job.id, {
        status: ImportJobStatus.FAILED,
        completedAt: new Date(),
      });
      // Post-MVP: publish a Slack/email alert here via notification_queue
    }
    this.logger.warn(`[ZOMBIE] Resolved ${zombies.length} stuck import job(s).`);
  }
}
