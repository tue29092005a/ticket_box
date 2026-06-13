import { Controller, Get, Post, Param, Body, Sse, MessageEvent, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { SseService } from './sse.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly sseService: SseService,
  ) {}

  @Get('show/:id/seats')
  async getSeatStatus(@Param('id') concert_id: string) {
    return this.bookingService.getSeatStatus(Number(concert_id));
  }

  @Get('show/:id/inventory')
  async getInventory(@Param('id') concert_id: string) {
    return this.bookingService.getInventory(Number(concert_id));
  }


  @UseGuards(JwtAuthGuard)
  @Post('ga')
  async bookGA(@Req() req, @Body() body: { concert_id: number; quantity: number; zoneType?: string }) {
    const zoneType = body.zoneType || 'Normal';
    const userId = req.user.userId;
    return this.bookingService.bookGATicket(body.concert_id, userId, body.quantity, zoneType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('svip')
  async bookSVIP(@Req() req, @Body() body: { concert_id: number; seatNo: string }) {
    const userId = req.user.userId;
    return this.bookingService.bookSVIPTicket(body.concert_id, userId, body.seatNo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold')
  async bookHold(@Req() req, @Body() body: { concert_id: number; seats: string[]; ticketCounts: Record<string, number> }) {
    const userId = req.user.userId;
    for (const seat of body.seats || []) {
      await this.bookingService.bookSVIPTicket(body.concert_id, userId, seat);
    }
    const counts = body.ticketCounts || {};
    for (const [zone, count] of Object.entries(counts)) {
      if (count > 0) {
        await this.bookingService.bookGATicket(body.concert_id, userId, count, zone);
      }
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay')
  async payTickets(@Body() body: any, @Req() req) {
    return this.bookingService.payTickets(body.concert_id, req.user.userId, body);
  }

  @Sse('sse/:userId')
  sse(@Param('userId') userId: string): Observable<MessageEvent> {
    const subject = this.sseService.addClient(userId);
    return subject.asObservable().pipe(
      map((payload) => ({ data: payload }))
    );
  }
}
