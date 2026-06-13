import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import NodeCache from 'node-cache';
import { Response } from 'express';

// Lớp quản lý các kết nối HTTP Streaming (Server-Sent Events)
@Injectable()
export class SSEManager {
  private readonly logger = new Logger(SSEManager.name);
  // Map lưu trữ: concertId -> danh sách các client (Response objects)
  private connections = new Map<string, Set<Response>>();

  // Đăng ký client lắng nghe
  subscribe(concertId: string, res: Response) {
    if (!this.connections.has(concertId)) {
      this.connections.set(concertId, new Set());
    }
    this.connections.get(concertId)!.add(res);

    // Xóa kết nối khỏi pool khi client đóng tab/mất mạng
    res.on('close', () => {
      this.connections.get(concertId)?.delete(res);
      if (this.connections.get(concertId)?.size === 0) {
        this.connections.delete(concertId);
      }
    });
  }

  // Phát tín hiệu cập nhật (Push notification) tới toàn bộ client của một show
  broadcast(concertId: string, data: any) {
    const subscribers = this.connections.get(concertId);
    if (subscribers) {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      for (const res of subscribers) {
        res.write(`event: ${data.type}\n`);
        res.write(payload); // Stream payload json
      }
    }
  }
}

// Lớp lắng nghe Pub/Sub và điều phối Invalidation Cache
@Injectable()
export class CacheInvalidationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private subscriber: Redis;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('LOCAL_CACHE') private readonly localCache: NodeCache,
    private readonly sseManager: SSEManager,
  ) {}

  async onModuleInit() {
    // Dùng một duplicate connection riêng biệt dành cho việc subscribe theo Ràng buộc C-3
    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe('cache:invalidation');

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'cache:invalidation') {
        try {
          const event = JSON.parse(message);
          this.handleInvalidation(event);
        } catch (e) {
          this.logger.error('Lỗi parse message pub/sub', e);
        }
      }
    });
    this.logger.log('Đã đăng ký lắng nghe Redis Pub/Sub: cache:invalidation');
  }

  onModuleDestroy() {
    this.subscriber.quit();
  }

  /**
   * Xử lý luồng giải phóng bộ nhớ (Tier 1) và đẩy SSE
   */
  private handleInvalidation(event: any) {
    switch (event.type) {
      case 'TICKET_COUNT_UPDATED':
        // 1. Evict (Xóa) khóa trong Local RAM Cache (Tier 1)
        // Request tiếp theo từ client sẽ bị cache miss ở Tier 1, gọi tiếp lên Redis Tier 2
        const localKey = `local:concert:${event.concertId}:tickets`;
        this.localCache.del(localKey);
        this.logger.log(`Đã xóa local cache: ${localKey}`);

        // 2. Stream Real-time Update xuống trình duyệt client đang duy trì kết nối HTTP Streaming
        this.sseManager.broadcast(event.concertId, {
          type: 'ticket-update',
          zone: event.zone,
          remaining: event.remainingTickets, // con số chính xác nhất từ Pub/Sub message
        });
        break;

      case 'CONCERT_UPDATED':
        this.localCache.del(`local:concert:${event.concertId}`);
        break;

      case 'SEATMAP_UPDATED':
        this.localCache.del(`local:concert:${event.concertId}:seatmap`);
        break;
    }
  }
}
