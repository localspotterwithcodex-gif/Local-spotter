import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';

/**
 * Public endpoint called by Mollie. It carries no signature, so the handler
 * treats the body as an untrusted hint (a payment id) and re-reads everything
 * from the Mollie API. Always answers 200 for ids it does not know.
 */
@ApiTags('Payments')
@Controller('payments/webhooks')
@UseGuards(RateLimitGuard)
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('mollie')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 300, windowMs: 60 * 1000 })
  @ApiOperation({ summary: 'Mollie payment status webhook (form-encoded id)' })
  async mollie(@Body() body: { id?: unknown }) {
    const id = typeof body?.id === 'string' ? body.id : '';
    await this.payments.handleMollieWebhook(id);
    return { ok: true };
  }
}
