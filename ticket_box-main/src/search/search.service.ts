import { Injectable, Inject, Logger } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { MEILISEARCH_CLIENT } from '../config/meilisearch.config';
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.config';
import * as crypto from 'crypto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  // Local cache TTL 5m (300 giây)
  private localCache = new NodeCache({ stdTTL: 300 });
  private activePromises = new Map<string, Promise<any>>(); // SingleFlight pattern

  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meiliClient: MeiliSearch,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.subscribeToCacheInvalidation();
  }

  // Meilisearch cho Fuzzy Search & Typeahead (Prefix)
  async searchShows(query: string) {
    const cacheKey = `search:${query}`;

    // 1. Kiểm tra Local Cache trước
    const cachedResult = this.localCache.get(cacheKey);
    if (cachedResult) {
      this.logger.log(`[Cache Hit] Trả kết quả tìm kiếm cho '${query}' từ Local Cache`);
      return cachedResult;
    }

    // 2. SingleFlight Pattern: Chống Cache Stampede khi truy vấn Meilisearch
    if (this.activePromises.has(cacheKey)) {
      return this.activePromises.get(cacheKey);
    }

    this.logger.log(`[Cache Miss] Tìm kiếm '${query}' trên Meilisearch...`);

    const promise = (async () => {
      try {
        // 3. Tìm kiếm bằng Meilisearch (Hỗ trợ Fuzzy Search & Typo Tolerance)
        const index = this.meiliClient.index('shows');
        const searchResult = await index.search(query, {
          limit: 10,
          attributesToHighlight: ['name'], // Highlight từ khóa
        });

        // 4. Lưu vào Local Cache
        this.localCache.set(cacheKey, searchResult.hits);
        return searchResult.hits;
      } finally {
        this.activePromises.delete(cacheKey); // Giải phóng Lock
      }
    })();

    this.activePromises.set(cacheKey, promise);
    return promise;
  }

  // Admin đồng bộ lại Index (Khi có show mới/sửa tên show)
  async syncAdminData(showData: any) {
    const showId = crypto.randomUUID();
    showData.id = showId;

    const index = this.meiliClient.index('shows');
    
    await Promise.all([
      (async () => {
        this.logger.log(`[Simulated DB] Đã lưu show ${showId} vào PostgreSQL`);
      })(),
      index.addDocuments([showData])
    ]);

    // Báo cho các Instances (Pod/Container) khác biết để xoá Local Cache (Redis Pub/Sub)
    await this.redis.publish('cache_invalidation', 'search_cache');
    
    // Tự xoá cache của bản thân
    this.localCache.flushAll();

    this.logger.log('Đã cập nhật Meilisearch Index và gửi tín hiệu Invalidate Cache');
  }

  // Lắng nghe Redis Pub/Sub để Invalidate Local Cache
  private async subscribeToCacheInvalidation() {
    // Tạo 1 Redis client riêng cho việc subscribe (vì ioredis khi subscribe sẽ không gọi lệnh khác được)
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe('cache_invalidation');

    subscriber.on('message', (channel, message) => {
      if (channel === 'cache_invalidation' && message === 'search_cache') {
        this.logger.log('Nhận tín hiệu Invalidate Cache từ Redis Pub/Sub. Đang xoá Local Cache...');
        this.localCache.flushAll();
      }
    });
  }
}
