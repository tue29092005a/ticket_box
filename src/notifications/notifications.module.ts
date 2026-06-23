import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsCron } from './notifications.cron';
import { Invoice } from '../booking/entities/invoice.entity';
import { Ticket } from '../booking/entities/ticket.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';
import { ZoneInventory } from '../booking/entities/zone-inventory.entity';
import { ImportJob } from '../guest/entities/import-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Ticket, SeatInventory, ZoneInventory, ImportJob])],
  providers: [NotificationsService, NotificationsCron],
})
export class NotificationsModule {}

