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

        // ── Existing queues (Booking Service) ────────────────────────────────
        await channel.assertQueue('notification_queue', { durable: true });
        await channel.assertQueue('payment_success_queue', { durable: true });

        // DLX for hold timeout rollback (10-minute ticket hold)
        const dlxExchange = 'hold_timeout_dlx';
        await channel.assertExchange(dlxExchange, 'direct', { durable: true });
        const processQueue = 'hold_timeout_queue';
        await channel.assertQueue(processQueue, { durable: true });
        await channel.bindQueue(processQueue, dlxExchange, 'rollback');
        const waitQueue = 'hold_timeout_wait_queue';
        await channel.assertQueue(waitQueue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': dlxExchange,
            'x-dead-letter-routing-key': 'rollback',
          },
        });

        // ── Event Service queues ─────────────────────────────────────────────
        // Consumers: Notification Service, Booking Service (refund on cancel)
        // Future: when migrating to Kafka, remove these two lines and add
        // Kafka topic declarations in KafkaEventPublisher instead.
        await channel.assertQueue('event_published_queue', { durable: true });
        await channel.assertQueue('event_cancelled_queue', { durable: true });

        // ── Guest Service — VIP CSV Import queues ────────────────────────────
        // Main queue consumed by GuestImportProcessor (prefetch=1, one file at a time)
        await channel.assertQueue('vip_guest.import', { durable: true });

        // Dead Letter Exchange: after 3 nacks, failed import messages route here
        const guestDlx = 'guest_import_dlx';
        await channel.assertExchange(guestDlx, 'direct', { durable: true });
        await channel.assertQueue('dead_letter.vip_guest.import', { durable: true });
        await channel.bindQueue('dead_letter.vip_guest.import', guestDlx, 'failed');

        return channel;
      },
    },
  ],
  exports: [RABBITMQ_CHANNEL],
})
export class RabbitMQModule {}
