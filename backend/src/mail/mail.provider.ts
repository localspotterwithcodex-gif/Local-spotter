import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

export interface OutboundMessage {
  to: string;
  channel: 'EMAIL' | 'SMS';
  subject: string;
  text: string;
}

/** Boundary to the email/SMS delivery service (email: Resend; SMS: not implemented). */
export interface MailProvider {
  isConfigured(): boolean;
  send(message: OutboundMessage): Promise<void>;
}

/** Production default until a provider is wired: refuses to pretend delivery. */
@Injectable()
export class UnconfiguredMailProvider implements MailProvider {
  private readonly logger = new Logger(UnconfiguredMailProvider.name);

  isConfigured(): boolean {
    return false;
  }

  async send(): Promise<void> {
    this.logger.error('Message not sent: no email/SMS provider configured (set MAIL_TRANSPORT=resend)');
    throw new ServiceUnavailableException('Message delivery is not configured');
  }
}

/**
 * Local development only (MAIL_TRANSPORT=dev-file): writes each message to
 * `.dev-outbox/` (git-ignored) instead of sending it, so one-time codes and
 * reset links never appear in application logs. Rejected in production by
 * env validation.
 */
@Injectable()
export class DevFileMailProvider implements MailProvider {
  isConfigured(): boolean {
    return true;
  }

  async send(message: OutboundMessage): Promise<void> {
    const dir = join(process.cwd(), '.dev-outbox');
    await mkdir(dir, { recursive: true });
    const safeTo = message.to.replace(/[^a-zA-Z0-9@._+-]/g, '_').slice(0, 80);
    await writeFile(join(dir, `${Date.now()}-${safeTo}.json`), JSON.stringify(message, null, 2), 'utf8');
  }
}

export interface ResendOptions {
  apiKey: string;
  from: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Production email delivery through the Resend HTTP API (no SDK dependency).
 * - EMAIL only; SMS is not implemented and fails loudly (503) instead of pretending.
 * - One retry on network errors / 5xx / 429, reusing an Idempotency-Key so the
 *   recipient can never get the same code twice.
 * - Never logs the API key, recipient or message body (codes/links are secrets).
 */
@Injectable()
export class ResendMailProvider implements MailProvider {
  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: ResendOptions) {
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return true;
  }

  async send(message: OutboundMessage): Promise<void> {
    if (message.channel !== 'EMAIL') {
      this.logger.error('SMS delivery requested but no SMS provider is implemented');
      throw new ServiceUnavailableException('Message delivery is not configured');
    }
    const idempotencyKey = randomUUID();
    let lastStatus: number | string = 'network';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.fetchFn('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.opts.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            from: this.opts.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (res.ok) return;
        lastStatus = res.status;
        const retryable = res.status === 429 || res.status >= 500;
        if (!retryable) break;
      } catch {
        lastStatus = 'network';
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
    this.logger.error(`Resend delivery failed (status: ${lastStatus})`);
    throw new ServiceUnavailableException('Message delivery failed');
  }
}
