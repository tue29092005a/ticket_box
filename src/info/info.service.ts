import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ShowInfo, ShowInfoDocument } from './schemas/show-info.schema';
import { Concert } from './entities/concert.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';

@Injectable()
export class InfoService implements OnModuleInit {
  private readonly logger = new Logger(InfoService.name);
  private activePromises = new Map<string, Promise<any>>(); // SingleFlight pattern

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Concert) private readonly showRepo: Repository<Concert>,
    @InjectRepository(ZoneInventory) private readonly zoneRepo: Repository<ZoneInventory>,
    @InjectModel(ShowInfo.name) private readonly showInfoModel: Model<ShowInfoDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('Seeding Concert and ShowInfo into database...');
    const count = await this.showRepo.count();
    if (count > 0) {
      this.logger.log('Concerts already exist. Skipping seed.');
      return;
    }
    
    // Xóa cache cũ để hiển thị ngay ảnh mới
    await this.redis.del('all_shows');

    const concerts = [
      { id: 1, name: 'NEON DREAMS FESTIVAL 2024', performanceDate: new Date('2026-10-24T18:00:00Z'), location: 'My Dinh Stadium, Hanoi', status: 'ON_SALE' },
      { id: 2, name: 'Midnight Jazz Session', performanceDate: new Date('2026-11-15T20:00:00Z'), location: 'Binh Minh Jazz Club', status: 'ON_SALE' },
      { id: 3, name: '[Dốc Mộng Mơ] Starlight - Quốc Thiên', performanceDate: new Date('2026-06-06T19:30:00Z'), location: 'Trung Tâm Nghệ Thuật Âu Cơ, Hà Nội', status: 'ON_SALE' },
      { id: 4, name: 'Anh Trai "Say Hi" 2025', performanceDate: new Date('2025-12-05T19:30:00Z'), location: 'Phu Tho Stadium, HCMC', status: 'ON_SALE' },
    ];
    await this.showRepo.insert(concerts);

    const zones = [
      // Show 1
      { concert_id: 1, zone: 'SVIP', price: 2000000, totalCapacity: 50, availableSlots: 50 },
      { concert_id: 1, zone: 'VIP', price: 1000000, totalCapacity: 150, availableSlots: 150 },
      { concert_id: 1, zone: 'GA', price: 500000, totalCapacity: 500, availableSlots: 500 },
      // Show 2
      { concert_id: 2, zone: 'VIP', price: 1500000, totalCapacity: 30, availableSlots: 30 },
      { concert_id: 2, zone: 'Standard', price: 800000, totalCapacity: 100, availableSlots: 100 },
      // Show 3
      { concert_id: 3, zone: 'SVIP', price: 2500000, totalCapacity: 100, availableSlots: 100 },
      { concert_id: 3, zone: 'VIP', price: 1500000, totalCapacity: 200, availableSlots: 200 },
      { concert_id: 3, zone: 'Normal', price: 800000, totalCapacity: 400, availableSlots: 400 },
      // Show 4
      { concert_id: 4, zone: 'SVIP', price: 3000000, totalCapacity: 50, availableSlots: 50 },
      { concert_id: 4, zone: 'VIP1', price: 2000000, totalCapacity: 150, availableSlots: 150 },
      { concert_id: 4, zone: 'VIP2', price: 1500000, totalCapacity: 200, availableSlots: 200 },
      { concert_id: 4, zone: 'GA', price: 700000, totalCapacity: 600, availableSlots: 600 },
    ];
    await this.zoneRepo.insert(zones);

    const infos = [
      { 
        concert_id: 1, description: 'The world\'s largest immersive digital music experience returns to Hanoi for one night only.', artistBio: 'Top DJs from Tomorrowland', mediaUrls: [], rules: 'No outside food or drinks. 18+ only.', coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8MdEbV0frFQ0aUda3LPIZoCnoqzhBMvmWD98rbMKXvOwDQe3pTMC4nDpABZ5roTCvYwoe5uftLPC7_TaIOIFEQLScUn1fn4B8T03oJWqir5Y4EAUfts1eS2fnWeVqxtYm2z_RHWTK5A7Vm53sOkycXQhf4iQRRsT9dgj8hz6Ev7eWe7x-_EMCcQo_7DVDwxazTtds9IV9jDkg7KynE5CQEClt3PbcDutBIDcUkqo6c_52J37uBrqp2c4RqDVSoGlcPE8NjCUSKBY2',
        zoneSetups: [
          { name: 'SVIP', price: 2000000, color: '#FFD700', benefits: ['Fast Track', 'Free Drinks'] },
          { name: 'VIP', price: 1000000, color: '#C0C0C0', benefits: ['Free Drinks'] },
          { name: 'GA', price: 500000, color: '#8B4513', benefits: [] }
        ]
      },
      { 
        concert_id: 2, description: 'Experience the magic of live jazz in an intimate setting.', artistBio: 'Featuring Tran Manh Tuan and friends.', mediaUrls: [], rules: 'Smart casual dress code.', coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEZKKpYQbiNBJYhiH3k1geASGn5o9pd03RJpHTt72LA6N7VH7j1GTD2WZYHhZmqkblmQ1QFnlXBX6uPHXFeuxaMn6sYNtv35-RIG4PuwpzTg67JaqVUE-a8qWNUm7GJQl5lxSKPIgzIntWCWqbsCwSf4wEPaFiofmfJl41i1MKy_Mp8fbDVEz_BoiRZp78TbSLq0FngADVCBCgKG034Hn68-u_KHOBNblt3y1t4G9DO0A3ef7Zb6aaiezvW8bL0c3cnn8VK8-aYuny',
        zoneSetups: [
          { name: 'VIP', price: 1500000, color: '#C0C0C0', benefits: ['Front Row', 'Wine'] },
          { name: 'Standard', price: 800000, color: '#4682B4', benefits: [] }
        ]
      },
      { 
        concert_id: 3, description: 'Đêm nhạc thay lời cảm ơn chân thành tới đại gia đình nhà Mây.', artistBio: 'Ca sĩ Quốc Thiên và ban nhạc', mediaUrls: [], rules: 'Tickets are non-refundable.', coverImage: '/starlight-2026.jpg',
        zoneSetups: [
          { name: 'SVIP', price: 2500000, color: '#FFD700', benefits: ['Meet & Greet', 'Gift Box'] },
          { name: 'VIP', price: 1500000, color: '#C0C0C0', benefits: ['Gift Box'] },
          { name: 'Normal', price: 800000, color: '#32CD32', benefits: [] }
        ]
      },
      { 
        concert_id: 4, description: 'Đêm nhạc hội tụ 30 Anh Trai với những màn trình diễn đỉnh cao chưa từng có.', artistBio: '30 Anh Trai hot nhất Vbiz', mediaUrls: [], rules: 'Không mang đồ ăn thức uống', coverImage: '/anh-trai-say-hi-2025.png',
        zoneSetups: [
          { name: 'SVIP', price: 3000000, color: '#FFD700', benefits: ['Backstage Pass'] },
          { name: 'VIP1', price: 2000000, color: '#FF69B4', benefits: ['Poster'] },
          { name: 'VIP2', price: 1500000, color: '#BA55D3', benefits: [] },
          { name: 'GA', price: 700000, color: '#20B2AA', benefits: [] }
        ]
      },
    ];
    await this.showInfoModel.insertMany(infos);
  }

  // Lấy danh sách tất cả các show
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

        const postgresShows = await this.showRepo.find();
        const mongoInfos = await this.showInfoModel.find().lean();

        // Nối dữ liệu
        const finalData = postgresShows.map(show => {
          const info = mongoInfos.find(i => i.concert_id === show.id);
          return {
            id: show.id,
            name: show.name,
            performanceDate: show.performanceDate,
            location: show.location,
            status: show.status,
            coverImage: info?.coverImage,
            description: info?.description,
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
  async getShowInfo(concert_id: number) {
    const cacheKey = `concert_info:${concert_id}`;
    
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
        const [postgresData, postgresZones, mongoData] = await Promise.all([
          this.showRepo.findOne({ where: { id: concert_id } }),
          this.zoneRepo.find({ where: { concert_id } }),
          this.showInfoModel.findOne({ concert_id }).lean()
        ]);

        const mongoZones = mongoData?.zoneSetups || [];
        const zones = postgresZones.map(pz => {
          const mz = mongoZones.find(m => m.name === pz.zone);
          return {
            zone: pz.zone,
            price: pz.price,
            totalCapacity: pz.totalCapacity,
            availableSlots: pz.availableSlots,
            color: mz?.color || '#cccccc',
            benefits: mz?.benefits || []
          };
        });

        const finalData = {
          id: concert_id,
          name: postgresData?.name || 'Unknown Show',
          performanceDate: postgresData?.performanceDate,
          location: postgresData?.location,
          description: mongoData?.description,
          artistBio: mongoData?.artistBio,
          rules: mongoData?.rules,
          coverImage: mongoData?.coverImage,
          zones: zones
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
