import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RedisModule } from './config/redis.config';
import { RabbitMQModule } from './config/rabbitmq.config';
import { MeilisearchModule } from './config/meilisearch.config';
import { typeOrmConfig } from './config/database.config';

import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    ScheduleModule.forRoot(),
    RedisModule,
    RabbitMQModule,
    MeilisearchModule,
    AuthModule,
    BookingModule,
    NotificationsModule,
    SearchModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'ticketbox-client', 'dist'),
    }),
  ],
})
export class AppModule {}
