import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { InfoModule } from './info/info.module';
import { PaymentModule } from './payment/payment.module';
import { WorkerModule } from './worker/worker.module';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoConfig } from './config/mongo.config';

const coreModules = [
  ConfigModule.forRoot(),
  TypeOrmModule.forRoot(typeOrmConfig),
  MongooseModule.forRoot(mongoConfig.uri),
  ScheduleModule.forRoot(),
  RedisModule,
  RabbitMQModule,
  MeilisearchModule,
  NotificationsModule,
  ServeStaticModule.forRoot({
    rootPath: join(__dirname, '..', 'ticketbox-client', 'dist'),
  }),
];

let serviceModules = [];
const serviceName = process.env.SERVICE_NAME;

if (serviceName === 'auth') {
  serviceModules = [AuthModule];
} else if (serviceName === 'booking') {
  serviceModules = [BookingModule];
} else if (serviceName === 'info') {
  serviceModules = [InfoModule, SearchModule];
} else if (serviceName === 'payment') {
  serviceModules = [PaymentModule];
} else if (serviceName === 'worker') {
  serviceModules = [WorkerModule];
} else {
  // Monolithic fallback
  serviceModules = [AuthModule, BookingModule, InfoModule, SearchModule, PaymentModule, WorkerModule];
}

@Module({
  imports: [...coreModules, ...serviceModules],
})
export class AppModule {}
