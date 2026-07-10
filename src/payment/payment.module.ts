import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaypalClient } from './paypal.client';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';
import { BookingModule } from '../booking/booking.module';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdempotencyKey, SeatInventory, ZoneInventory]),
    BookingModule, // Để inject SseService
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaypalClient, JwtStrategy],
  exports: [PaymentService],
})
export class PaymentModule {}
