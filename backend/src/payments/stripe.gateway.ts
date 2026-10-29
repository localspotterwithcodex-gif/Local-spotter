import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  GatewayCreatePaymentRequest,
  GatewayCreatePaymentResult,
  GatewayDiagnosis,
  GatewayPaymentInfo,
  GatewayPaymentStatus,
  GatewayRefundRequest,
  GatewayRefundResult,
  PaymentGateway,
  providerError,
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

/** Internal: Stripe answered with an error. Converted to a coded 502 before leaving the gateway. */
class StripeRejected extends Error {
  constructor(readonly status: number, readonly param: string, readonly detail: string) {
    super('Stripe rejected the request');
  }
  get paymentMethodProblem(): boolean {
    return this.status === 400 && (/payment_method_types/.test(this.param) || /payment method|ideal/i.test(this.detail));
  }
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
    const params = this.checkoutParams(req);
    let json: any;
    try {
      json = await this.callRaw('POST', '/checkout/sessions', params, req.idempotencyKey);
    } catch (err) {
      // iDEAL not available for this Stripe account/mode: let Stripe offer whatever methods the dashboard enables
      // for EUR instead of failing every payment. Different params need a different idempotency key.
      if (!(err instanceof StripeRejected) || !err.paymentMethodProblem) throw providerError('The payment provider rejected the request');
      this.logger.warn('iDEAL is not available on this Stripe account; retrying with the dashboard payment methods');
      delete params['payment_method_types[0]'];
      json = await this.callRaw('POST', '/checkout/sessions', params, `${req.idempotencyKey}-auto`).catch(() => {
        throw providerError('The payment provider rejected the request');
      });
    }
    return { providerPaymentId: String(json.id), checkoutUrl: typeof json.url === 'string' ? json.url : null };
  }

  private checkoutParams(req: GatewayCreatePaymentRequest): Record<string, string> {
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
    return params;
  }

  async diagnose(frontendUrl: string): Promise<GatewayDiagnosis> {
    const key = this.secretKey;
    const kind: GatewayDiagnosis['keyKind'] = !key
      ? 'none'
      : key.startsWith('sk_test_') ? 'test'
      : key.startsWith('sk_live_') ? 'live'
      : key.startsWith('pk_') ? 'publishable'
      : key.startsWith('rk_') ? 'restricted'
      : 'unknown';
    const frontendUrlValid = /^https?:\/\/[^\s/]+/.test(frontendUrl);
    const base = { configured: !!key, keyKind: kind, frontendUrl, frontendUrlValid };
    if (!key) return { ...base, ok: false, httpStatus: null, code: 'NO_KEY', param: null, message: 'STRIPE_SECRET_KEY is not set on the server.', hint: 'Set STRIPE_SECRET_KEY (sk_test_…) on Render and redeploy.' };
    if (kind === 'publishable') return { ...base, ok: false, httpStatus: null, code: 'WRONG_KEY_TYPE', param: null, message: 'STRIPE_SECRET_KEY holds a publishable key (pk_…).', hint: 'Use the SECRET key (sk_test_…) from Stripe → Developers → API keys.' };
    const params = this.checkoutParams({
      amountCents: 100, currency: 'EUR', description: 'LocalSpotter setup check',
      redirectUrl: `${frontendUrl}/payment/return?payment=setup-check`, metadata: {}, idempotencyKey: '', locale: 'nl_NL',
    });
    let res: Response;
    try {
      res = await fetch(`${STRIPE_BASE}/checkout/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form(params),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return { ...base, ok: false, httpStatus: null, code: 'UNREACHABLE', param: null, message: 'Stripe could not be reached from the server.', hint: 'Check the server’s outbound network access.' };
    }
    const text = await res.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch { /* not JSON */ }
    if (res.ok) {
      // The trial session is never used: expire it so nothing stays open at Stripe.
      await fetch(`${STRIPE_BASE}/checkout/sessions/${encodeURIComponent(String(json.id))}/expire`, {
        method: 'POST', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT_MS),
      }).catch(() => undefined);
      return { ...base, ok: true, httpStatus: res.status, code: null, param: null, message: null, hint: 'Stripe accepted a trial iDEAL checkout. Payments can start.' };
    }
    const e = json?.error ?? {};
    const code = e.code ?? e.type ?? null;
    const param = e.param ?? null;
    const message = typeof e.message === 'string' ? e.message.slice(0, 400) : null;
    let hint = 'Stripe refused the trial checkout; see the message.';
    if (res.status === 401) hint = 'The API key is invalid or from another Stripe account. Copy the secret key again (sk_test_…) into STRIPE_SECRET_KEY and redeploy.';
    else if (param?.includes('url')) hint = 'FRONTEND_URL must be a full address such as https://local-spotter-alpha.vercel.app (with https://).';
    else if (/ideal|payment method/i.test(message ?? '')) hint = 'iDEAL is not enabled for this Stripe account/mode. Stripe → Settings → Payment methods → enable iDEAL (in the same Test mode as the key). Note: iDEAL needs a Stripe account in a supported country; if yours is not, Stripe will refuse it.';
    return { ...base, ok: false, httpStatus: res.status, code: code ? String(code) : null, param: param ? String(param) : null, message, hint };
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
    if (!req.providerTransactionId) throw providerError('Payment has no provider reference');
    // A refund targets the PaymentIntent that the Checkout Session created when it was paid.
    const session = await this.call('GET', `/checkout/sessions/${encodeURIComponent(req.providerTransactionId)}`);
    const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!intent) throw providerError('Payment has not been completed at the provider');
    const json = await this.call(
      'POST',
      '/refunds',
      { payment_intent: String(intent), amount: String(req.amountCents), 'metadata[paymentId]': req.paymentId },
      req.idempotencyKey,
    );
    return { providerRefundId: String(json.id) };
  }

  private async call(method: 'GET' | 'POST', path: string, params?: Record<string, string>, idempotencyKey?: string): Promise<any> {
    try {
      return await this.callRaw(method, path, params, idempotencyKey);
    } catch (err) {
      if (err instanceof StripeRejected) throw providerError('The payment provider rejected the request');
      throw err;
    }
  }

  private async callRaw(method: 'GET' | 'POST', path: string, params?: Record<string, string>, idempotencyKey?: string): Promise<any> {
    const key = this.secretKey;
    if (!key) throw providerError('Payment provider is not configured');
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
      throw providerError('The payment provider is unreachable');
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
      // Stripe's error text names the offending parameter (never a secret), which is what is needed to fix a misconfiguration.
      const e = json?.error ?? {};
      this.logger.error(`Stripe ${label} -> ${res.status} ${String(e.code ?? e.type ?? '')} ${String(e.param ?? '')} ${String(e.message ?? '').slice(0, 300)}`.trim());
      throw new StripeRejected(res.status, String(e.param ?? ''), String(e.message ?? ''));
    }
    return json;
  }
}
