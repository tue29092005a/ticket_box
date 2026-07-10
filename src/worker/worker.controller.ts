import { Controller, Post, Body, Headers, Inject } from '@nestjs/common';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';
import * as amqp from 'amqplib';

@Controller('worker')
export class WorkerController {
  constructor(@Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel) {}

  /**
   * Endpoint phụ để nhận webhook thay thế cho payment service khi đang test
   * Điểm này bỏ qua phần xác thực chữ ký để đơn giản hóa cho quá trình test.
   */
  @Post('webhook')
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ) {
    const rawBody = JSON.stringify(body);
    
    // Đẩy nguyên event vào RabbitMQ (durable queue)
    this.rabbitChannel.sendToQueue(
      'payment_webhook_queue',
      Buffer.from(rawBody),
      { persistent: true },
    );

    return { received: true };
  }
}
