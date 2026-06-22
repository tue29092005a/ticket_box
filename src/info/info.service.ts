import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ShowInfo, ShowInfoDocument } from './schemas/show-info.schema';
import { Concert } from './entities/concert.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';

/**
 * InfoService — Legacy read-only service for the original show list/detail endpoints.
 * New event management (CRUD wizard) is handled by EventService in the event/ module.
 *
 * Endpoints still served:
 *   GET /info/shows       → all active concerts (basic list)
 *   GET /info/show/:id    → full show detail with zones
 */
@Injectable()
export class InfoService {
  private readonly logger = new Logger(InfoService.name);
  private activePromises = new Map<string, Promise<any>>(); // SingleFlight pattern

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Concert) private readonly showRepo: Repository<Concert>,
    @InjectRepository(ZoneInventory) private readonly zoneRepo: Repository<ZoneInventory>,
    @InjectModel(ShowInfo.name) private readonly showInfoModel: Model<ShowInfoDocument>,
  ) {}

  // Lấy danh sách tất cả các show (ACTIVE status)
  async getAllShows() {
    const cacheKey = 'all_shows';
    const redisData = await this.redis.get(cacheKey);
    if (redisData) {
      return JSON.parse(redisData);
    }

    if (this.activePromises.has(cacheKey)) {
      return this.activePromises.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const doubleCheck = await this.redis.get(cacheKey);
        if (doubleCheck) return JSON.parse(doubleCheck);

        const postgresShows = await this.showRepo.find({ where: { status: 'ACTIVE' } });
        const mongoInfos = await this.showInfoModel.find().lean();

        // Join PG + Mongo data
        const finalData = postgresShows.map(show => {
          const info = mongoInfos.find(i => i['showId'] === show.id);
          return {
            id: show.id,
            slug: show.slug,
            performanceDate: show.performanceDate,
            status: show.status,
            name: info?.['name'] ?? null,
            venue_name: info?.['venue_name'] ?? null,
            province: info?.['province'] ?? null,
            image_url: info?.['image_url'] ?? null,
            cover_image_url: info?.['cover_image_url'] ?? null,
            category: info?.['category'] ?? null,
            description: info?.['description'] ?? null,
          };
        });

        await this.redis.set(cacheKey, JSON.stringify(finalData), 'EX', 60);
        return finalData;
      } finally {
        this.activePromises.delete(cacheKey);
      }
    })();
    this.activePromises.set(cacheKey, promise);
    return promise;
  }

  // Lấy thông tin Show với Cache-Aside và SingleFlight (Mutex Lock cục bộ)
  async getShowInfo(showId: string) {
    const cacheKey = `show_info:${showId}`;

    // 1. Kiểm tra trên Redis (Cache-Aside)
    const redisData = await this.redis.get(cacheKey);
    if (redisData) {
      return JSON.parse(redisData);
    }

    // 2. SingleFlight Pattern: Tránh Cache Stampede khi Cache Miss
    if (this.activePromises.has(cacheKey)) {
      return this.activePromises.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const doubleCheck = await this.redis.get(cacheKey);
        if (doubleCheck) return JSON.parse(doubleCheck);

        // 3. Phân tách DB: Truy vấn đồng thời PostgreSQL và MongoDB
        const [postgresData, postgresZones, mongoData] = await Promise.all([
          this.showRepo.findOne({ where: { id: showId } }),
          this.zoneRepo.find({ where: { showId } }),
          this.showInfoModel.findOne({ showId }).lean(),
        ]);

        const zones = postgresZones.map(pz => ({
          zone: pz.zone,
          price: pz.price,
          totalCapacity: pz.totalCapacity,
          availableSlots: pz.availableSlots,
        }));

        const finalData = {
          id: showId,
          slug: postgresData?.slug || null,
          name: mongoData?.['name'] || null,
          performanceDate: postgresData?.performanceDate,
          venue_name: mongoData?.['venue_name'] || null,
          province: mongoData?.['province'] || null,
          description: mongoData?.['description'],
          category: mongoData?.['category'],
          image_url: mongoData?.['image_url'],
          cover_image_url: mongoData?.['cover_image_url'],
          organizer_name: mongoData?.['organizer_name'],
          privacy: mongoData?.['privacy'] || 'PUBLIC',
          zones,
        };

        await this.redis.set(cacheKey, JSON.stringify(finalData), 'EX', 60);
        return finalData;
      } finally {
        this.activePromises.delete(cacheKey);
      }
    })();

    this.activePromises.set(cacheKey, promise);
    return promise;
  }
}
