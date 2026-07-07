import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { ImportJob } from './entities/import-job.entity';
import { GuestImportProcessor } from '../apps-worker/processors/guest-import.processor';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { Ticket } from '../booking/entities/ticket.entity';

// MinioService is available globally via @Global() MinioModule in app.module.ts
// No need to import MinioModule here.
@Module({
  imports: [TypeOrmModule.forFeature([ImportJob, SeatInventory, Ticket])],
  controllers: [GuestController],
  providers: [GuestService, GuestImportProcessor],
  exports: [GuestService],
})
export class GuestModule {}
