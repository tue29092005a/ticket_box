import { Injectable, Inject, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { Subject } from 'rxjs';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER_CLIENT } from '../config/redis.config';
import { BookingService } from './booking.service';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private clients = new Map<string, Subject<any>[]>();
  private readonly CHANNEL_NAME = 'ticketbox_sse_broadcast';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @Inject(REDIS_SUBSCRIBER_CLIENT) private readonly redisSubscriber: Redis,
    @Inject(forwardRef(() => BookingService)) private readonly bookingService: BookingService,
  ) {}

  onModuleInit() {
    this.redisSubscriber.subscribe(this.CHANNEL_NAME, (err, count) => {
      if (err) {
        console.error('Failed to subscribe to Redis channel', err);
      }
    });

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === this.CHANNEL_NAME) {
        try {
          const data = JSON.parse(message);
          if (this.bookingService && typeof this.bookingService.updateLocalSeatCache === 'function') {
            this.bookingService.updateLocalSeatCache(data);
          }
          this.broadcastToLocalClients(data);
        } catch (err) {
          console.error('Failed to parse SSE message', err);
        }
      }
    });
  }

  onModuleDestroy() {
    this.redisSubscriber.unsubscribe(this.CHANNEL_NAME);
  }

  addClient(clientId: string) {
    const subject = new Subject<any>();
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }
    this.clients.get(clientId)!.push(subject);
    return subject;
  }

  removeClient(clientId: string) {
    const subjects = this.clients.get(clientId);
    if (subjects) {
      subjects.forEach(s => s.complete());
      this.clients.delete(clientId);
    }
  }

  notifyClient(clientId: string, data: any) {
    const subjects = this.clients.get(clientId);
    if (subjects) {
      subjects.forEach(s => s.next(data));
    }
  }

  // Phương thức này gửi tới tất cả client ĐANG kết nối với máy chủ Node.js NÀY
  private broadcastToLocalClients(data: any) {
    for (const subjects of this.clients.values()) {
      subjects.forEach(s => s.next(data));
    }
  }

  // Phát tín hiệu Pub/Sub lên Redis để mọi server Node.js khác đều nhận được
  async broadcast(data: any) {
    await this.redisClient.publish(this.CHANNEL_NAME, JSON.stringify(data));
  }
}
