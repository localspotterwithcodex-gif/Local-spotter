import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface GatewayRefundRequest {
  paymentId: string;
  providerTransactionId: string | null;
  amountCents: number;
  currency: string;
  /** Stable per refund attempt — the provider must de-duplicate on this key. */
  idempotencyKey: string;
}

export interface GatewayRefundResult {
  providerRefundId: string;
}

/**
 * Boundary to the payment service provider (PSP). The concrete provider
 * (Mollie Connect / Stripe Connect) is an open product decision (see
 * docs/DECISIONS-AND-CONFLICTS.md D-004), so only this interface exists.
 * A refund is only ever recorded as completed after `refund()` resolves,
 * i.e. after the provider has confirmed it.
 */
export interface PaymentGateway {
  isConfigured(): boolean;
  refund(request: GatewayRefundRequest): Promise<GatewayRefundResult>;
}

/** Default binding until a provider is chosen: refuses instead of pretending. */
@Injectable()
export class UnconfiguredPaymentGateway implements PaymentGateway {
  isConfigured(): boolean {
    return false;
  }

  async refund(): Promise<GatewayRefundResult> {
    throw new ServiceUnavailableException('No payment provider is configured; refunds cannot be processed');
  }
}
