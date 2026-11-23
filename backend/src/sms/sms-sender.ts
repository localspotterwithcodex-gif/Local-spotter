import { Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const SMS_SENDER = Symbol('SMS_SENDER');

/** Bird categories: OTP is `authentication`, order updates are `transactional`. */
export type SmsCategory = 'authentication' | 'transactional';

export interface SmsRequest {
  /** E.164, e.g. +31612345678 */
  to: string;
  text: string;
  category: SmsCategory;
  /** One per logical message; a retry reuses it so the provider never sends twice. */
  idempotencyKey: string;
}

/** Delivers text only. Codes are generated and checked by the backend (OtpService). */
export interface SmsSender {
  readonly provider: string;
  isConfigured(): boolean;
  send(req: SmsRequest): Promise<{ providerMessageId: string | null }>;
}

/** A send that failed for good. `code` is stored in sms_messages.error_code (never the number or text). */
export class SmsSendError extends Error {
  constructor(readonly code: string) {
    super(`SMS not sent (${code})`);
  }
}

export class UnconfiguredSmsSender implements SmsSender {
  readonly provider = 'none';
  isConfigured(): boolean {
    return false;
  }
  async send(): Promise<{ providerMessageId: string | null }> {
    throw new SmsSendError('NOT_CONFIGURED');
  }
}

/** Local development: writes each SMS to backend/.dev-outbox/ (git-ignored). Refuses to exist in production. */
export class DevFileSmsSender implements SmsSender {
  readonly provider = 'dev-file';
  constructor(private readonly dir = join(process.cwd(), '.dev-outbox')) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMS_PROVIDER=dev-file is not allowed in production');
  }
  isConfigured(): boolean {
    return true;
  }
  async send(req: SmsRequest): Promise<{ providerMessageId: string | null }> {
    await mkdir(this.dir, { recursive: true });
    const id = `dev-${Date.now()}`;
    await writeFile(join(this.dir, `${id}-sms-${req.to.replace(/\D/g, '')}.json`), JSON.stringify({ channel: 'SMS', ...req }, null, 2), 'utf8');
    return { providerMessageId: id };
  }
}

export interface BirdOptions {
  apiKey: string;
  /** Regional host, e.g. https://eu1.platform.bird.com (a key sent to the wrong region gets 421). */
  baseUrl: string;
  from: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Bird SMS API (bird.com/docs, checked 2026-11-18): POST {base}/v1/sms/messages with a bearer key and an
 * Idempotency-Key. A replay within 3 hours returns the original result; 5xx responses are NOT retained by Bird,
 * so a retry after a 5xx could send twice: we retry only network errors and 429, always with the same key.
 * Never logs the key, number or text.
 */
export class BirdSmsSender implements SmsSender {
  readonly provider = 'bird';
  private readonly logger = new Logger('BirdSms');
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly opts: BirdOptions) {
    this.fetchFn = opts.fetchFn ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  isConfigured(): boolean {
    return true;
  }

  async send(req: SmsRequest): Promise<{ providerMessageId: string | null }> {
    const url = `${this.opts.baseUrl.replace(/\/+$/, '')}/v1/sms/messages`;
    const maxRetries = this.opts.maxRetries ?? 2;
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchFn(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.opts.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': req.idempotencyKey },
          body: JSON.stringify({ from: this.opts.from, to: req.to, text: req.text, category: req.category }),
          signal: AbortSignal.timeout(this.opts.timeoutMs ?? 10_000),
        });
      } catch {
        if (attempt < maxRetries) {
          await this.sleep(1000 * 2 ** attempt);
          continue;
        }
        this.logger.error('Bird unreachable');
        throw new SmsSendError('NETWORK');
      }
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { id?: unknown };
        return { providerMessageId: typeof body.id === 'string' ? body.id : null };
      }
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 1000 * 2 ** attempt);
        continue;
      }
      this.logger.error(`Bird refused the SMS (status ${res.status})`);
      throw new SmsSendError(`HTTP_${res.status}`);
    }
  }
}

/** SMS_PROVIDER=bird|dev-file; unset = dev-file outside production, nothing in production. */
export function smsSenderFromConfig(get: (key: string) => string | undefined): SmsSender {
  const provider = (get('SMS_PROVIDER') ?? '').trim();
  if (provider === 'bird') {
    return new BirdSmsSender({
      apiKey: (get('BIRD_API_KEY') ?? '').trim(),
      baseUrl: (get('BIRD_API_BASE_URL') ?? 'https://eu1.platform.bird.com').trim(),
      from: (get('BIRD_SMS_FROM') ?? '').trim(),
    });
  }
  if (provider === 'dev-file' || (!provider && process.env.NODE_ENV !== 'production')) return new DevFileSmsSender();
  return new UnconfiguredSmsSender();
}
