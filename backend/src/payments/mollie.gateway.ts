import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GatewayCreatePaymentRequest,
  GatewayCreatePaymentResult,
  GatewayPaymentInfo,
  GatewayPaymentStatus,
  GatewayRefundRequest,
  GatewayRefundResult,
  PaymentGateway,
} from './payment-gateway';

const MOLLIE_BASE = 'https://api.mollie.com/v2';
const TIMEOUT_MS = 10_000;

const METHOD_MAP: Record<string, string> = {
  IDEAL: 'ideal',
  CARD: 'creditcard',
  PAYPAL: 'paypal',
  BANK_TRANSFER: 'banktransfer',
};

const STATUS_MAP: Record<string, GatewayPaymentStatus> = {
  open: 'PENDING',
  pending: 'PENDING',
  authorized: 'AUTHORIZED',
  paid: 'PAID',
  failed: 'FAILED',
  canceled: 'CANCELLED',
  expired: 'EXPIRED',
};

export function formatMollieAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseMollieAmount(value: string): number {
  return Math.round(Number(value) * 100);
}

/**
 * Mollie (REST v2) adapter. The platform account collects all payments; the
 * stores' share is tracked in the ledger and paid out separately.
 * The API key is read from MOLLIE_API_KEY and never logged.
 */
@Injectable()
export class MollieGateway implements PaymentGateway {
  private readonly logger = new Logger(MollieGateway.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    const key = this.config.get<string>('MOLLIE_API_KEY')?.trim();
    return key ? key : undefined;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async createPayment(req: GatewayCreatePaymentRequest): Promise<GatewayCreatePaymentResult> {
    const body: Record<string, unknown> = {
      amount: { currency: req.currency, value: formatMollieAmount(req.amountCents) },
      description: req.description.slice(0, 255),
      redirectUrl: req.redirectUrl,
      metadata: req.metadata,
    };
    if (req.webhookUrl) body.webhookUrl = req.webhookUrl;
    if (req.method) body.method = METHOD_MAP[req.method];
    if (req.locale) body.locale = req.locale;
    const json = await this.call('POST', '/payments', body, req.idempotencyKey);
    return { providerPaymentId: String(json.id), checkoutUrl: json?._links?.checkout?.href ?? null };
  }

  async getPayment(providerPaymentId: string): Promise<GatewayPaymentInfo> {
    const json = await this.call('GET', `/payments/${encodeURIComponent(providerPaymentId)}`);
    const status = STATUS_MAP[String(json.status)];
    if (!status) throw new BadGatewayException('Unknown payment status from provider');
    return {
      providerPaymentId: String(json.id),
      status,
      amountCents: parseMollieAmount(String(json.amount?.value ?? '0')),
      currency: String(json.amount?.currency ?? 'EUR'),
      metadata: json.metadata && typeof json.metadata === 'object' ? (json.metadata as Record<string, string>) : {},
      checkoutUrl: json?._links?.checkout?.href ?? null,
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (!req.providerTransactionId) throw new BadGatewayException('Payment has no provider reference');
    const json = await this.call(
      'POST',
      `/payments/${encodeURIComponent(req.providerTransactionId)}/refunds`,
      { amount: { currency: req.currency, value: formatMollieAmount(req.amountCents) } },
      req.idempotencyKey,
    );
    return { providerRefundId: String(json.id) };
  }

  private async call(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<any> {
    const key = this.apiKey;
    if (!key) throw new BadGatewayException('Payment provider is not configured');
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    let res: Response;
    try {
      res = await fetch(`${MOLLIE_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      this.logger.error(`Mollie ${method} ${path.split('/').slice(0, 2).join('/')} unreachable`);
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
      // Never log the request body or key; provider detail is kept short.
      this.logger.error(`Mollie ${method} ${path.split('/').slice(0, 2).join('/')} -> ${res.status} ${String(json?.title ?? '')}`);
      throw new BadGatewayException('The payment provider rejected the request');
    }
    return json;
  }
}
