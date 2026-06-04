import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import NodeCache from 'node-cache';

export const LOCAL_CACHE_CONFIG = {
  stdTTL: 1, // TTL = 1 giây cho dữ liệu động số lượng vé (Tier 1)
  checkperiod: 10, // Dọn dọn rác mỗi 10 giây
  useClones: false, // Tăng tốc độ bằng cách tắt deep clone
};

// Đăng ký Providers cho NestJS Dependency Injection
export const HybridCacheProviders: Provider[] = [
  {
    provide: 'REDIS_CLIENT',
    useFactory: () => {
      // Kết nối tới Standalone Redis hoặc Redis Cluster (trong docker-compose là standalone)
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null, // Yêu cầu từ amqplib/bullmq
      });
      return redis;
    },
  },
  {
    provide: 'LOCAL_CACHE',
    useFactory: () => {
      // Khởi tạo Node Cache (RAM cục bộ tại App Node)
      return new NodeCache(LOCAL_CACHE_CONFIG);
    },
  },
];
