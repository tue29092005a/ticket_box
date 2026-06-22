import { Injectable, Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import { IEventPublisher } from '../interfaces/event-publisher.interface';
import { RABBITMQ_CHANNEL } from '../../config/rabbitmq.config';

@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly channel: amqp.Channel,
  ) {}

  async publish(topic: string, data: any): Promise<void> {
    const queueMap: Record<string, string> = {
      'EVENT_PUBLISHED': 'event_published_queue',
      'EVENT_CANCELLED': 'event_cancelled_queue',
    };

    const queueName = queueMap[topic];
    if (queueName) {
      this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true,
      });
    } else {
      console.warn(`[RabbitMQEventPublisher] Unmapped topic: ${topic}`);
    }
  }
}
