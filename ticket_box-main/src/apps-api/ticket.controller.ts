import { Controller, Post, Get, Param, Body, Res, Req, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { TicketService } from './modules/ticket/ticket.service';
import { SSEManager } from './modules/ticket/sse.processor';

@Controller('api/v1')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly sseManager: SSEManager,
  ) {}

  @Post('tickets/reserve')
  async reserve(
    @Body() body: { userId: string; concertId: string; zoneId: string; quantity: number; idempotencyKey: string; maxPerUser?: number },
  ) {
    const { userId, concertId, zoneId, quantity, idempotencyKey } = body;
    if (!userId || !concertId || !zoneId || !quantity || !idempotencyKey) {
      throw new BadRequestException('Vui lòng điền đầy đủ các thông tin bắt buộc.');
    }
    
    // Gọi Service xử lý Inverse Atomic Counter
    return await this.ticketService.reserveTicket(
      userId,
      concertId,
      zoneId,
      Number(quantity),
      idempotencyKey,
    );
  }

  @Get('concerts/:id/live-slots')
  async liveSlots(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Thiết lập HTTP Headers cho luồng Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Tắt Nginx Buffer để đảm bảo dữ liệu đẩy ngay lập tức
      'Access-Control-Allow-Origin': '*', // Cho phép mọi nguồn (CORS)
    });

    // Heartbeat để giữ kết nối không bị ngắt (Ping mỗi 15s)
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    // Đăng ký nhận luồng SSE thông qua SSEManager
    this.sseManager.subscribe(id, res);

    // Gửi sự kiện kết nối thành công ban đầu
    res.write(`event: connected\ndata: {"status": "ok", "concertId": "${id}"}\n\n`);

    // Hủy đăng ký khi client đóng kết nối (close tab/F5)
    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }
}
