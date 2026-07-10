import { Global, Module } from '@nestjs/common';
import * as amqp from 'amqplib';

export const RABBITMQ_CHANNEL = 'RABBITMQ_CHANNEL';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CHANNEL,
      useFactory: async () => {
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
        const channel = await conn.createChannel();
        
        await channel.assertQueue('notification_queue', { durable: true });
        await channel.assertQueue('payment_success_queue', { durable: true });
        
        // Cấu hình DLX (Dead Letter Exchange) để giả lập Delayed Messaging cho Timeout Rollback (10 phút)
        const dlxExchange = 'hold_timeout_dlx';
        await channel.assertExchange(dlxExchange, 'direct', { durable: true });
        
        // Queue xử lý rollback thực tế khi hết thời gian giữ vé
        const processQueue = 'hold_timeout_queue';
        await channel.assertQueue(processQueue, { durable: true });
        await channel.bindQueue(processQueue, dlxExchange, 'rollback');
        
        // Queue chờ (chứa message có TTL). Hết TTL, message sẽ tự động chuyển sang dlxExchange
        const waitQueue = 'hold_timeout_wait_queue';
        await channel.assertQueue(waitQueue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': dlxExchange,
            'x-dead-letter-routing-key': 'rollback',
          }
        });
        
        return channel;
      },
    },
  ],
  exports: [RABBITMQ_CHANNEL],
})
export class RabbitMQModule {}
