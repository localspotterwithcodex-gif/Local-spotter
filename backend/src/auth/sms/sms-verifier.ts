import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export const SMS_VERIFIER = Symbol('SMS_VERIFIER');

/** Sends and checks one-time SMS codes. The provider generates the code; we never see it. */
export interface SmsVerifier {
  isConfigured(): boolean;
  /** Sends a new code to an E.164 number (the provider picks the language from the number's country). */
  start(to: string): Promise<void>;
  /** True only when the provider approves the code for that number. */
  check(to: string, code: string): Promise<boolean>;
}

/** Used when no SMS provider is configured (mobile codes then fall back to the mail provider, i.e. dev-file locally). */
export class UnconfiguredSmsVerifier implements SmsVerifier {
  isConfigured(): boolean {
    return false;
  }

  async start(): Promise<void> {
    throw new ServiceUnavailableException('SMS delivery is not configured');
  }

  async check(): Promise<boolean> {
    return false;
  }
}

export interface TwilioVerifyOptions {
  accountSid: string;
  authToken: string;
  serviceSid: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Twilio Verify over its REST API (no SDK). Twilio handles sender IDs and per-country SMS rules.
 * Never logs the auth token, phone number or code.
 */
@Injectable()
export class TwilioVerify implements SmsVerifier {
  private readonly logger = new Logger(TwilioVerify.name);
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: TwilioVerifyOptions) {
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return true;
  }

  async start(to: string): Promise<void> {
    const res = await this.post('Verifications', { To: to, Channel: 'sms' });
    if (!res.ok) {
      this.logger.error(`Twilio Verify send failed (status: ${res.status})`);
      throw new ServiceUnavailableException('SMS delivery failed');
    }
  }

  async check(to: string, code: string): Promise<boolean> {
    const res = await this.post('VerificationCheck', { To: to, Code: code });
    // 404: no pending verification (expired, already approved or too many tries); 429: Twilio's own limit.
    if (res.status === 404 || res.status === 429) return false;
    if (!res.ok) {
      this.logger.error(`Twilio Verify check failed (status: ${res.status})`);
      throw new ServiceUnavailableException('SMS verification is unavailable');
    }
    const body = (await res.json().catch(() => ({}))) as { status?: string };
    return body.status === 'approved';
  }

  private async post(path: string, form: Record<string, string>): Promise<Response> {
    const auth = Buffer.from(`${this.opts.accountSid}:${this.opts.authToken}`).toString('base64');
    try {
      return await this.fetchFn(`https://verify.twilio.com/v2/Services/${encodeURIComponent(this.opts.serviceSid)}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString(),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 8000),
      });
    } catch {
      this.logger.error('Twilio Verify unreachable');
      throw new ServiceUnavailableException('SMS delivery is unavailable');
    }
  }
}
