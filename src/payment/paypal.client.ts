import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaypalClient {
  private readonly logger = new Logger(PaypalClient.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private get baseUrl(): string {
    return process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  }

  private get clientId(): string {
    return (process.env.PAYPAL_CLIENT_ID || '').trim();
  }

  private get secret(): string {
    return (process.env.PAYPAL_SECRET || '').trim();
  }

  /**
   * Lấy OAuth2 Bearer Token từ PayPal (có cache 8 giờ)
   */
  async getAccessToken(): Promise<string> {
    if (this.clientId === 'test') return 'mock_token';

    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.secret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`PayPal OAuth2 failed: ${response.status} ${errorText}`);
      throw new Error(`PayPal OAuth2 failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Cache token cho 8 giờ (PayPal token mặc định sống 9h)
    this.tokenExpiresAt = Date.now() + 8 * 60 * 60 * 1000;
    return this.accessToken;
  }

  /**
   * Tạo PayPal Order
   */
  async createOrder(amountUSD: string, referenceId: string, description: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: referenceId,
          description,
          amount: {
            currency_code: 'USD',
            value: amountUSD,
          },
        }],
        application_context: {
          brand_name: 'TicketBox',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`PayPal createOrder failed: ${response.status} ${errorText}`);
      throw new Error(`PayPal createOrder failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Capture (chốt) thanh toán PayPal Order
   */
  async captureOrder(orderId: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`PayPal captureOrder failed: ${response.status} ${errorText}`);
      throw new Error(`PayPal captureOrder failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Xác minh chữ ký Webhook từ PayPal
   */
  async verifyWebhookSignature(headers: Record<string, string>, body: string): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not set, skipping verification in dev mode');
      return true; // Dev mode: skip verification
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!response.ok) {
      this.logger.error(`PayPal webhook verification failed: ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  }
}
