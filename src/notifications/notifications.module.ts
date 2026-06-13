import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsCron } from './notifications.cron';

@Module({
  providers: [NotificationsService, NotificationsCron],
})
export class NotificationsModule {}
