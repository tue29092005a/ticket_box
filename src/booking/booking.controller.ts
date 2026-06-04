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
  async getSeatStatus(@Param('id') id: string) {
    return this.bookingService.getSeatStatus(id);
  }

  @Get('show/:id/inventory')
  async getInventory(@Param('id') id: string) {
    return this.bookingService.getInventory(id);
  }


  @UseGuards(JwtAuthGuard)
  @Post('ga')
  async bookGA(@Req() req, @Body() body: { showId: string; quantity: number; zoneType?: string }) {
    const zoneType = body.zoneType || 'Normal';
    const userId = req.user.userId;
    return this.bookingService.bookGATicket(body.showId, userId, body.quantity, zoneType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('svip')
  async bookSVIP(@Req() req, @Body() body: { showId: string; seatNo: string }) {
    const userId = req.user.userId;
    return this.bookingService.bookSVIPTicket(body.showId, userId, body.seatNo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('hold')
  async bookHold(@Req() req, @Body() body: { showId: string; seats: string[]; vipCount: number; normalCount: number }) {
    const userId = req.user.userId;
    for (const seat of body.seats) {
      await this.bookingService.bookSVIPTicket(body.showId, userId, seat);
    }
    if (body.vipCount > 0) {
      await this.bookingService.bookGATicket(body.showId, userId, body.vipCount, 'VIP');
    }
    if (body.normalCount > 0) {
      await this.bookingService.bookGATicket(body.showId, userId, body.normalCount, 'Normal');
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pay')
  async payTickets(@Body() body: any, @Req() req) {
    return this.bookingService.payTickets(body.showId, req.user.userId, body);
  }

  @Sse('sse/:userId')
  sse(@Param('userId') userId: string): Observable<MessageEvent> {
    const subject = this.sseService.addClient(userId);
    return subject.asObservable().pipe(
      map((payload) => ({ data: payload }))
    );
  }
}
