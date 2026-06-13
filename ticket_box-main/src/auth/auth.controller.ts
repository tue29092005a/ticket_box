import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password?: string }) {
    return this.authService.register(body.email, body.password || '123456');
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password || '123456');
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refreshToken(body.userId, body.refreshToken);
  }
}
