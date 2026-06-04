import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { SseService } from './sse.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatInventory } from './entities/seat-inventory.entity';
import { ZoneInventory } from './entities/zone-inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeatInventory, ZoneInventory]),
  ],
  controllers: [BookingController],
  providers: [BookingService, SseService],
  exports: [BookingService, SseService],
})
export class BookingModule {}
