import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { EventController } from './event.controller';
import { EventService } from './event.service';

import { Concert } from '../info/entities/concert.entity';
import { EventTicketType } from '../info/entities/event-ticket-type.entity';
import { SeatInventory } from '../info/entities/seat-inventory.entity';
import { ShowInfo, ShowInfoSchema } from '../info/schemas/show-info.schema';

import { EVENT_PUBLISHER } from './interfaces/event-publisher.interface';
import { RabbitMQEventPublisher } from './publishers/rabbitmq-event.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([Concert, EventTicketType, SeatInventory]),
    MongooseModule.forFeature([{ name: ShowInfo.name, schema: ShowInfoSchema }]),
  ],
  controllers: [EventController],
  providers: [
    EventService,
    {
      provide: EVENT_PUBLISHER,
      useClass: RabbitMQEventPublisher,
    },
  ],
  exports: [EventService],
})
export class EventModule {}
