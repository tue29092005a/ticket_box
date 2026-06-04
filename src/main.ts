import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Bật CORS cho phép kết nối linh hoạt
  app.enableCors();

  // Cấu hình phục vụ file Static (Vite Build) từ thư mục ticketbox-client/dist
  app.useStaticAssets(join(__dirname, '..', 'ticketbox-client', 'dist'));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n===============================================================`);
  console.log(`🚀 API Server: http://localhost:${port}`);
  console.log(`===============================================================\n`);
}
bootstrap();
