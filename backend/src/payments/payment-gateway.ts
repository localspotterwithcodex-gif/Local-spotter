import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

/** Machine-readable code on the 503 returned while no payment provider is configured; the UI shows a specific message for it. */
export const PAYMENTS_UNAVAILABLE_CODE = 'PAYMENTS_UNAVAILABLE';

/** Machine-readable code on the 502 returned when the provider refused or could not be reached. */
export const PAYMENT_PROVIDER_ERROR_CODE = 'PAYMENT_PROVIDER_ERROR';

export const providerError = (message: string) => new BadGatewayException({ code: PAYMENT_PROVIDER_ERROR_CODE, message });

export const paymentsUnavailable = (message: string) => new ServiceUnavailableException({ code: PAYMENTS_UNAVAILABLE_CODE, message });

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

export interface GatewayCreatePaymentRequest {
  amountCents: number;
  currency: string;
  description: string;
  /** Where the provider sends the customer after the hosted checkout. */
  redirectUrl: string;
  /** Payment method; iDEAL is the only one offered. */
  method?: 'IDEAL';
  /** Echoed back by the provider; used to cross-check webhooks. */
  metadata: Record<string, string>;
  /** Stable per attempt so a retried call never creates a second payment. */
  idempotencyKey: string;
  locale?: string;
}

export interface GatewayCreatePaymentResult {
  providerPaymentId: string;
  checkoutUrl: string | null;
}

export type GatewayPaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface GatewayPaymentInfo {
  providerPaymentId: string;
  status: GatewayPaymentStatus;
  amountCents: number;
  currency: string;
  metadata: Record<string, string>;
  checkoutUrl: string | null;
}

/**
 * Boundary to the payment service provider (PSP). The provider is Stripe
 * (see stripe.gateway.ts, iDEAL via Checkout); `UnconfiguredPaymentGateway` is bound when no API key is set.
 * A refund is only ever recorded as completed after `refund()` resolves,
 * i.e. after the provider has confirmed it.
 */
export interface PaymentGateway {
  isConfigured(): boolean;
  createPayment(request: GatewayCreatePaymentRequest): Promise<GatewayCreatePaymentResult>;
  /** Authoritative status read straight from the provider (webhooks only carry an id). */
  getPayment(providerPaymentId: string): Promise<GatewayPaymentInfo>;
  refund(request: GatewayRefundRequest): Promise<GatewayRefundResult>;
}

/** Bound when STRIPE_SECRET_KEY is missing: refuses instead of pretending. */
@Injectable()
export class UnconfiguredPaymentGateway implements PaymentGateway {
  isConfigured(): boolean {
    return false;
  }

  async createPayment(): Promise<GatewayCreatePaymentResult> {
    throw paymentsUnavailable('No payment provider is configured; payments cannot be started');
  }

  async getPayment(): Promise<GatewayPaymentInfo> {
    throw paymentsUnavailable('No payment provider is configured');
  }

  async refund(): Promise<GatewayRefundResult> {
    throw paymentsUnavailable('No payment provider is configured; refunds cannot be processed');
  }
}
