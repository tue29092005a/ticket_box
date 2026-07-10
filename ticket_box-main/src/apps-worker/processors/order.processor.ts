import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketType } from '../entities/ticket-type.entity';

@Injectable()
export class OrderProcessor implements OnModuleInit {
  private readonly logger = new Logger(OrderProcessor.name);
  private amqpChannel: amqp.Channel;

  constructor(
    @Inject('AMQP_CONNECTION') private readonly amqpConnection: amqp.ChannelModel,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
  ) {}

  async onModuleInit() {
    try {
      this.amqpChannel = await this.amqpConnection.createChannel();
      
      const queue = 'order_queue';
      await this.amqpChannel.assertQueue(queue, { durable: true });
      
      // ĐIỀU TIẾT TẢI (Flow Control / Prefetch)
      // Chỉ kéo tối đa 100 message xử lý đồng thời để tránh quá tải kết nối DB
      await this.amqpChannel.prefetch(100);

      this.logger.log(`Background Worker: Bắt đầu lắng nghe queue '${queue}' [Prefetch = 100]`);
      
      this.amqpChannel.consume(queue, async (msg) => {
        if (msg) {
          await this.processMessage(msg);
        }
      }, { noAck: false }); // Ack thủ công
    } catch (err) {
      this.logger.error('Lỗi khởi động Background Worker:', err.message);
    }
  }

  private async processMessage(msg: amqp.ConsumeMessage) {
    try {
      const payload = JSON.parse(msg.content.toString());
      const { userId, concertId, zoneId, quantity, idempotencyKey } = payload;

      this.logger.log(`Worker: Đang xử lý đơn hàng [${idempotencyKey}] cho user [${userId}]`);

      const ticketType = await this.ticketTypeRepository.findOne({
        where: { concert_id: Number(concertId), name: zoneId }
      });

      if (!ticketType || ticketType.remaining_quantity < quantity) {
        throw new Error(`[Database ERROR] Không đủ tồn kho trong DB thực tế cho zone ${zoneId}`);
      }

      ticketType.remaining_quantity -= quantity;
      await this.ticketTypeRepository.save(ticketType);
      
      const newStock = ticketType.remaining_quantity;

      // 3. ĐỒNG BỘ CACHE: Gửi sự kiện invalidation đến kênh Pub/Sub của Redis
      // Sự kiện này giúp tất cả các App Server instance xóa local cache và đẩy SSE xuống client
      await this.redis.publish('cache:invalidation', JSON.stringify({
        type: 'TICKET_COUNT_UPDATED',
        concertId: concertId,
        zone: zoneId,
        remainingTickets: newStock,
        timestamp: Date.now(),
      }));

      // Xác nhận hoàn tất thành công message
      this.amqpChannel.ack(msg);
      this.logger.log(`Worker: Đặt vé THÀNH CÔNG cho đơn hàng [${idempotencyKey}]. Tồn kho DB còn: ${newStock}`);

    } catch (error) {
      this.logger.error(`Worker: Thất bại khi xử lý đơn hàng: ${error.message}`);
      // Nack và đẩy lại queue (hoặc Dead Letter Queue nếu thử lại thất bại nhiều lần)
      this.amqpChannel.nack(msg, false, false);
    }
  }
}
