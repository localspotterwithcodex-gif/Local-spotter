import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  GatewayCreatePaymentRequest,
  GatewayCreatePaymentResult,
  GatewayPaymentInfo,
  GatewayPaymentStatus,
  GatewayRefundRequest,
  GatewayRefundResult,
  PaymentGateway,
} from './payment-gateway';

const STRIPE_BASE = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 10_000;

/**
 * Verifies a `Stripe-Signature` header (`t=<unix>,v1=<hmac>[,v1=...]`) against the raw request body.
 * The HMAC-SHA256 is computed over `${t}.${rawBody}` with the endpoint's signing secret; events
 * older than the tolerance are rejected so a captured request cannot be replayed later.
 */
export function verifyStripeSignature(
  rawBody: Buffer | string,
  header: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!header || !secret) return false;
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v ?? '';
    else if (k === 'v1' && v) signatures.push(v);
  }
  const t = Number(timestamp);
  if (!timestamp || !Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - t) > toleranceSec) return false;
  const payload = Buffer.concat([Buffer.from(`${timestamp}.`), Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody)]);
  const expected = createHmac('sha256', secret).update(payload).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Stripe's REST API takes form-encoded bodies with bracket notation for nesting. */
function form(params: Record<string, string>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, v);
  return body.toString();
}

function stripeLocale(locale?: string): string {
  return locale?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

/**
 * Stripe adapter (Checkout Sessions, iDEAL only). The platform account collects all payments; the
 * stores' share is tracked in the ledger and paid out separately. The provider payment id stored in
 * our database is the Checkout Session id (`cs_...`); the secret key is read from STRIPE_SECRET_KEY
 * and never logged.
 */
@Injectable()
export class StripeGateway implements PaymentGateway {
  private readonly logger = new Logger(StripeGateway.name);

  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string | undefined {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    return key ? key : undefined;
  }

  isConfigured(): boolean {
    return !!this.secretKey;
  }

  async createPayment(req: GatewayCreatePaymentRequest): Promise<GatewayCreatePaymentResult> {
    const params: Record<string, string> = {
      mode: 'payment',
      'payment_method_types[0]': 'ideal',
      success_url: req.redirectUrl,
      cancel_url: req.redirectUrl,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': req.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(req.amountCents),
      'line_items[0][price_data][product_data][name]': req.description.slice(0, 250) || 'LocalSpotter',
      locale: stripeLocale(req.locale),
    };
    if (req.metadata.paymentId) params.client_reference_id = req.metadata.paymentId;
    for (const [k, v] of Object.entries(req.metadata)) {
      params[`metadata[${k}]`] = v;
      params[`payment_intent_data[metadata][${k}]`] = v;
    }
    const json = await this.call('POST', '/checkout/sessions', params, req.idempotencyKey);
    return { providerPaymentId: String(json.id), checkoutUrl: typeof json.url === 'string' ? json.url : null };
  }

  async getPayment(providerPaymentId: string): Promise<GatewayPaymentInfo> {
    const json = await this.call('GET', `/checkout/sessions/${encodeURIComponent(providerPaymentId)}`);
    let status: GatewayPaymentStatus = 'PENDING';
    if (json.payment_status === 'paid' || json.payment_status === 'no_payment_required') status = 'PAID';
    else if (json.status === 'expired') status = 'EXPIRED';
    return {
      providerPaymentId: String(json.id),
      status,
      amountCents: Number(json.amount_total ?? 0),
      currency: String(json.currency ?? 'eur').toUpperCase(),
      metadata: json.metadata && typeof json.metadata === 'object' ? (json.metadata as Record<string, string>) : {},
      checkoutUrl: typeof json.url === 'string' ? json.url : null,
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (!req.providerTransactionId) throw new BadGatewayException('Payment has no provider reference');
    // A refund targets the PaymentIntent that the Checkout Session created when it was paid.
    const session = await this.call('GET', `/checkout/sessions/${encodeURIComponent(req.providerTransactionId)}`);
    const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!intent) throw new BadGatewayException('Payment has not been completed at the provider');
    const json = await this.call(
      'POST',
      '/refunds',
      { payment_intent: String(intent), amount: String(req.amountCents), 'metadata[paymentId]': req.paymentId },
      req.idempotencyKey,
    );
    return { providerRefundId: String(json.id) };
  }

  private async call(method: 'GET' | 'POST', path: string, params?: Record<string, string>, idempotencyKey?: string): Promise<any> {
    const key = this.secretKey;
    if (!key) throw new BadGatewayException('Payment provider is not configured');
    const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
    if (params) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const label = `${method} ${path.split('/').slice(0, 2).join('/')}`;
    let res: Response;
    try {
      res = await fetch(`${STRIPE_BASE}${path}`, {
        method,
        headers,
        body: params ? form(params) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      this.logger.error(`Stripe ${label} unreachable`);
      throw new BadGatewayException('The payment provider is unreachable');
    }
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      // Never log the request body or key; the provider's error code is enough to diagnose.
      this.logger.error(`Stripe ${label} -> ${res.status} ${String(json?.error?.code ?? json?.error?.type ?? '')}`);
      throw new BadGatewayException('The payment provider rejected the request');
    }
    return json;
  }
}
