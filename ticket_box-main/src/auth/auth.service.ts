import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 ngày
  private readonly GRACE_PERIOD = 30; // 30 giây grace period

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId });
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Lưu Refresh Token vào Redis
    const redisKey = `refresh_token:${userId}`;
    await this.redis.set(redisKey, refreshToken, 'EX', this.REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken };
  }

  async refreshToken(userId: string, oldRefreshToken: string) {
    const redisKey = `refresh_token:${userId}`;
    const graceKey = `grace_period:${userId}`;

    // Lấy token hiện tại từ Redis
    const currentToken = await this.redis.get(redisKey);

    // Xử lý Race Condition bằng Grace Period
    // Nếu token gửi lên không khớp với token trong Redis
    if (currentToken !== oldRefreshToken) {
      // Kiểm tra xem có đang trong Grace Period không (có request nào khác vừa refresh xong không)
      const inGracePeriod = await this.redis.get(graceKey);
      if (inGracePeriod) {
        // Trả về access token mới từ inGracePeriod mà không xoay vòng token nữa
        // Giúp các request gọi đồng thời (ví dụ nhiều tab) không bị logout
        return { accessToken: inGracePeriod, refreshToken: currentToken };
      }
      // Nếu không khớp và không trong Grace Period -> Có thể token bị đánh cắp
      await this.redis.del(redisKey);
      throw new UnauthorizedException('Invalid refresh token. Thao tác có thể không an toàn, buộc đăng xuất.');
    }

    // Token hợp lệ, tiến hành tạo cặp token mới
    const newTokens = await this.generateTokens(userId);

    // Lưu Access Token mới vào Grace Period key (tồn tại trong 30s)
    // Các request dùng oldRefreshToken trong 30s tới sẽ nhận được newTokens.accessToken này
    await this.redis.set(graceKey, newTokens.accessToken, 'EX', this.GRACE_PERIOD);

    return newTokens;
  }

  // Thay thế loginDev bằng Register thực tế
  async register(email: string, passwordPlain: string) {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new UnauthorizedException('Email đã tồn tại');
    }
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = this.userRepository.create({ email, passwordHash });
    await this.userRepository.save(user);
    
    return this.generateTokens(user.id);
  }

  // Thay thế bằng Login thực tế
  async login(email: string, passwordPlain: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    }
    
    // Nếu là dev user cũ (hashed_password) thì cho pass để tương thích, ngược lại dùng bcrypt
    if (user.passwordHash !== 'hashed_password') {
      const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
      }
    }
    
    return this.generateTokens(user.id);
  }
}
