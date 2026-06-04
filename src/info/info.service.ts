import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ShowInfo, ShowInfoDocument } from './schemas/show-info.schema';
import { Show } from './entities/show.entity';

@Injectable()
export class InfoService implements OnModuleInit {
  private readonly logger = new Logger(InfoService.name);
  private activePromises = new Map<string, Promise<any>>(); // SingleFlight pattern

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Show) private readonly showRepo: Repository<Show>,
    @InjectModel(ShowInfo.name) private readonly showInfoModel: Model<ShowInfoDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('Seeding Show and ShowInfo into database if not exists...');
    const showCount = await this.showRepo.count();
    if (showCount === 0) {
      await this.showRepo.insert({ showId: '1', name: 'Anh Trai Say Hi', timeStart: new Date(), timeEnd: new Date(), location: 'SVĐ Mỹ Đình', status: 'ON_SALE' });
    }
    const showInfoCount = await this.showInfoModel.countDocuments();
    if (showInfoCount === 0) {
      await this.showInfoModel.create({ showId: '1', description: 'Siêu đại nhạc hội lớn nhất năm 2026', artistBio: '30 Anh Trai hot nhất Vbiz', mediaUrls: [], rules: 'Không mang đồ ăn thức uống' });
    }
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
        // Double check phòng khi request đại diện khác vừa nạp vào Redis xong
        const doubleCheck = await this.redis.get(cacheKey);
        if (doubleCheck) {
          return JSON.parse(doubleCheck);
        }

        // 3. Phân tách DB: Truy vấn đồng thời PostgreSQL và MongoDB
        const [postgresData, mongoData] = await Promise.all([
          this.showRepo.findOne({ where: { showId } }),
          this.showInfoModel.findOne({ showId }).lean()
        ]);

        const finalData = {
          id: showId,
          name: postgresData?.name || 'Anh Trai Say Hi',
          timeStart: postgresData?.timeStart,
          location: postgresData?.location,
          description: mongoData?.description,
          artistBio: mongoData?.artistBio,
          rules: mongoData?.rules
        };
        
        // 4. Aggregate và Lưu Lên Redis với TTL 60s
        await this.redis.set(cacheKey, JSON.stringify(finalData), 'EX', 60);
        
        return finalData;
      } finally {
        this.activePromises.delete(cacheKey); // Giải phóng Lock
      }
    })();

    this.activePromises.set(cacheKey, promise);
    return promise;
  }
}
