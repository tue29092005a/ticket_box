import { Test, TestingModule } from '@nestjs/testing';
import { InfoService } from '../src/info/info.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { REDIS_CLIENT } from '../src/config/redis.config';
import { Show } from '../src/info/entities/show.entity';
import { ShowInfo } from '../src/info/schemas/show-info.schema';

describe('InfoService - getShowInfo SingleFlight Test', () => {
  let infoService: InfoService;
  
  // Mock dependencies
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockShowRepo = {
    findOne: jest.fn(),
  };

  const mockShowInfoModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfoService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: getRepositoryToken(Show), useValue: mockShowRepo },
        { provide: getModelToken(ShowInfo.name), useValue: mockShowInfoModel },
      ],
    }).compile();

    infoService = module.get<InfoService>(InfoService);
  });

  it('should only query DB once for 1000 concurrent requests when Cache Misses (SingleFlight pattern)', async () => {
    // Giả lập Redis luôn trả về null (Cache Miss)
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    // Giả lập DB Response
    const pgData = { name: 'Concert Test', timeStart: '2026-06-04' };
    const mongoData = { description: 'Super show', artistBio: 'Top Artist' };

    // Simulate Network Delay (10ms) to ensure concurrent requests pile up
    mockShowRepo.findOne.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(pgData), 10)));
    
    // Simulate mongoose lean() behavior
    const leanQuery = { lean: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mongoData), 10))) };
    mockShowInfoModel.findOne.mockReturnValue(leanQuery);

    // Kích hoạt 1.000 luồng Promise cùng 1 lúc
    const showId = 'show-123';
    const concurrentRequests = 1000;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(infoService.getShowInfo(showId));
    }

    // Đợi tất cả 1000 luồng hoàn thành
    const results = await Promise.all(promises);

    // KIỂM TRA ĐIỀU KIỆN 1: Tất cả 1000 luồng đều nhận được cùng 1 dữ liệu
    const expectedData = {
      id: showId,
      name: 'Concert Test',
      timeStart: '2026-06-04',
      location: undefined,
      description: 'Super show',
      artistBio: 'Top Artist',
      rules: undefined,
    };

    expect(results).toHaveLength(1000);
    results.forEach(result => {
      expect(result).toEqual(expectedData);
    });

    // KIỂM TRA ĐIỀU KIỆN 2: Database chỉ bị gọi CHÍNH XÁC 1 LẦN
    expect(mockShowRepo.findOne).toHaveBeenCalledTimes(1);
    expect(mockShowInfoModel.findOne).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledTimes(1); // Cập nhật cache đúng 1 lần

    console.log('✅ QA Test Passed: SingleFlight prevented Cache Stampede! DB queried exactly 1 time for 1000 requests.');
  });
});
