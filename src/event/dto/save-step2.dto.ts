import { TicketTypeDto } from './ticket-type.dto';

export class SaveStep2Dto {
  start_time: string; // ISO datetime
  ticket_types: TicketTypeDto[];
}
