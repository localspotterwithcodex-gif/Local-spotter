import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { verifyStripeSignature } from './stripe.gateway';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';

/** Stripe event types that can change the outcome of a Checkout Session. */
const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);

/**
 * Public endpoint called by Stripe. The signature over the raw body is verified first; even then
 * the handler only takes the Checkout Session id from the event and re-reads status, amount and
 * metadata from the Stripe API, so a forged or replayed event can never mark anything paid.
 */
@ApiTags('Payments')
@Controller('payments/webhooks')
@UseGuards(RateLimitGuard)
export class PaymentsWebhookController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 300, windowMs: 60 * 1000 })
  @ApiOperation({ summary: 'Stripe webhook (signed; checkout.session.* events)' })
  async stripe(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();
    if (!secret) throw new ServiceUnavailableException('Stripe webhooks are not configured');
    const raw = req.rawBody;
    if (!raw || !verifyStripeSignature(raw, signature, secret)) throw new BadRequestException('Invalid signature');

    let event: { type?: unknown; data?: { object?: { id?: unknown } } };
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid payload');
    }
    if (typeof event.type === 'string' && HANDLED_EVENTS.has(event.type)) {
      const id = event.data?.object?.id;
      await this.payments.handleProviderWebhook(typeof id === 'string' ? id : '');
    }
    return { ok: true };
  }
}
