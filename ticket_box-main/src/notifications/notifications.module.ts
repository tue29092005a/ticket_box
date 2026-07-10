import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsCron } from './notifications.cron';
import { Invoice } from '../booking/entities/invoice.entity';
import { Ticket } from '../booking/entities/ticket.entity';
import { SeatInventory } from '../booking/entities/seat-inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Ticket, SeatInventory])],
  providers: [NotificationsService, NotificationsCron],
})
export class NotificationsModule {}
