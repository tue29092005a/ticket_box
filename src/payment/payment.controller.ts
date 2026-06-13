import { Controller, Get, Post, Body, Req, Query, Headers, UseGuards, RawBodyRequest } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Trả PayPal Client ID cho frontend render SDK
   */
  @Get('config')
  getConfig() {
    return this.paymentService.getConfig();
  }

  /**
   * Kiểm tra user có đơn hàng pending không (back-button protection)
   */
  @UseGuards(JwtAuthGuard)
  @Get('pending-order')
  async getPendingOrder(@Req() req, @Query('concert_id') concert_id: string) {
    return this.paymentService.getPendingOrder(req.user.userId, Number(concert_id) || 1);
  }

  /**
   * Tạo PayPal Order
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(@Req() req, @Body() body: {
    concert_id: number;
    svipSeats: string[];
    ticketCounts: Record<string, number>;
    totalAmount: number;
    idempotencyKey: string;
  }) {
    return this.paymentService.createOrder(
      req.user.userId,
      body.concert_id,
      body.svipSeats || [],
      body.ticketCounts || {},
      body.totalAmount,
      body.idempotencyKey,
    );
  }

  /**
   * Capture (chốt) thanh toán PayPal
   */
  @UseGuards(JwtAuthGuard)
  @Post('capture')
  async captureOrder(@Req() req, @Body() body: {
    paypalOrderId: string;
    idempotencyKey: string;
    concert_id: number;
    svipSeats: string[];
    ticketCounts: Record<string, number>;
    totalAmount: number;
  }) {
    return this.paymentService.captureOrder(
      req.user.userId,
      body.paypalOrderId,
      body.idempotencyKey,
      body.concert_id,
      body.svipSeats || [],
      body.ticketCounts || {},
      body.totalAmount,
    );
  }

  /**
   * Webhook từ PayPal — Public endpoint, verify signature
   */
  @Post('webhook')
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: Request,
  ) {
    // Sử dụng raw body string cho signature verification
    const rawBody = JSON.stringify(body);
    return this.paymentService.handleWebhook(headers, rawBody);
  }
}
