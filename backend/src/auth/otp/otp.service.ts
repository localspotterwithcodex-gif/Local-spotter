import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, PhoneVerification, Prisma, SmsPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../sms/sms.service';
import { sharedCounterHit } from '../../common/guards/rate-limit.guard';

/** D12: 5 minutes for sign-up and login, 10 for password reset. */
export const OTP_TTL_MS: Record<OtpPurpose, number> = { SIGNUP: 5 * 60_000, LOGIN: 5 * 60_000, PASSWORD_RESET: 10 * 60_000 };
export const OTP_COOLDOWN_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_PER_DAY = 10;
/** Stored instead of a code hash when an external verifier (Twilio Verify, temporary) owns the code. */
export const PROVIDER_CODE = 'sms-provider';
/** Default SMS_ALLOWED_PREFIXES: the countries of the sign-up selector (NL BE DE FR GB ES IT PL TR MA SR IN US). */
const DEFAULT_PREFIXES = ['+31', '+32', '+49', '+33', '+44', '+34', '+39', '+48', '+90', '+212', '+597', '+91', '+1'];
const SMS_PURPOSE: Record<OtpPurpose, SmsPurpose> = { SIGNUP: SmsPurpose.OTP_SIGNUP, LOGIN: SmsPurpose.OTP_LOGIN, PASSWORD_RESET: SmsPurpose.OTP_RESET };

/** Twilio Verify (temporary fallback until Bird is verified on staging): the provider makes and checks the code. */
export interface ExternalVerifier {
  start(to: string): Promise<void>;
  check(to: string, code: string): Promise<boolean>;
}

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export function otpText(code: string, purpose: OtpPurpose, locale: 'nl' | 'en'): string {
  const min = OTP_TTL_MS[purpose] / 60_000;
  return locale === 'en'
    ? `LocalSpotter: your code is ${code}. Valid for ${min} min. Never share this code.`
    : `LocalSpotter: je code is ${code}. Geldig ${min} min. Deel deze code met niemand.`;
}

/**
 * One-time SMS codes for sign-up, login and password reset (MASTER-PROMPT 8.2), stored in phone_verifications:
 * 6 random digits, only an HMAC is kept, constant-time check, 5 tries, 60 s between sends, 5 per hour and 10 per
 * day per number, allowed country prefixes only. `mobile` must already be normalised to E.164.
 * Never logs a code or a full number.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  private hmac(purpose: OtpPurpose, mobile: string, code: string): string {
    const key = this.config.get<string>('OTP_HMAC_SECRET') || this.config.getOrThrow<string>('JWT_SECRET');
    return crypto.createHmac('sha256', key).update(`otp:${purpose}:${mobile}:${code}`).digest('hex');
  }

  allowedNumber(mobile: string): boolean {
    const raw = this.config.get<string>('SMS_ALLOWED_PREFIXES');
    const prefixes = raw ? raw.split(',').map((p) => p.trim()).filter(Boolean) : DEFAULT_PREFIXES;
    return prefixes.some((p) => mobile.startsWith(p));
  }

  canSend(external?: ExternalVerifier): boolean {
    return !!external || this.sms.isConfigured();
  }

  async send(purpose: OtpPurpose, mobile: string, opts: { userId?: string | null; ip?: string; locale?: 'nl' | 'en'; external?: ExternalVerifier } = {}) {
    if (!this.allowedNumber(mobile)) {
      throw new BadRequestException({ code: 'PHONE_COUNTRY_NOT_SUPPORTED', message: 'Sms-codes zijn voor dit land (nog) niet beschikbaar.' });
    }
    if (!this.canSend(opts.external)) throw new HttpException('Sms-codes zijn tijdelijk niet beschikbaar', HttpStatus.SERVICE_UNAVAILABLE);
    const now = new Date();
    const cooldown = (lastSentAt: Date) =>
      new HttpException(
        { code: 'OTP_COOLDOWN', message: 'Wacht even voordat je een nieuwe code aanvraagt.', retryAfterSeconds: Math.max(1, Math.ceil((lastSentAt.getTime() + OTP_COOLDOWN_MS - now.getTime()) / 1000)) },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const tooMany = () => new HttpException({ code: 'OTP_LIMIT', message: 'Te veel codes aangevraagd. Probeer het later opnieuw.' }, HttpStatus.TOO_MANY_REQUESTS);

    const existing = await this.prisma.phoneVerification.findUnique({ where: { mobile_purpose: { mobile, purpose } } });
    const newWindow = !existing || now.getTime() - existing.sendWindowStart.getTime() >= 60 * 60_000;
    if (existing && existing.lastSentAt.getTime() > now.getTime() - OTP_COOLDOWN_MS) throw cooldown(existing.lastSentAt);
    if (existing && !newWindow && existing.sendCount >= OTP_MAX_PER_HOUR) throw tooMany();
    if ((await sharedCounterHit(this.prisma, sha256(`otp-day:${mobile}`), 24 * 60 * 60_000)).count > OTP_MAX_PER_DAY) throw tooMany();

    const code = opts.external ? null : crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const fresh = {
      codeHash: code ? this.hmac(purpose, mobile, code) : PROVIDER_CODE,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS[purpose]),
      attempts: 0,
      lastSentAt: now,
      verifiedAt: null,
      consumedAt: null,
      tokenHash: null,
      userId: opts.userId ?? null,
      ipHash: opts.ip ? sha256(opts.ip) : null,
    };
    let rowId: string;
    if (!existing) {
      try {
        rowId = (await this.prisma.phoneVerification.create({ data: { mobile, purpose, ...fresh, sendCount: 1, sendWindowStart: now } })).id;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw cooldown(now); // a parallel request just sent one
        throw err;
      }
    } else {
      // Conditional update, so two parallel requests can't both pass the cooldown.
      const { count } = await this.prisma.phoneVerification.updateMany({
        where: { id: existing.id, lastSentAt: { lte: new Date(now.getTime() - OTP_COOLDOWN_MS) } },
        data: { ...fresh, ...(newWindow ? { sendCount: 1, sendWindowStart: now } : { sendCount: { increment: 1 } }) },
      });
      if (count === 0) throw cooldown(existing.lastSentAt);
      rowId = existing.id;
    }

    if (opts.external) {
      await opts.external.start(mobile);
    } else {
      const sent = await this.sms.send({
        purpose: SMS_PURPOSE[purpose],
        to: mobile,
        text: otpText(code!, purpose, opts.locale ?? 'nl'),
        category: 'authentication',
        idempotencyKey: `otp:${rowId}:${now.getTime()}`,
        userId: opts.userId ?? null,
      });
      if (!sent) throw new HttpException('De sms kon niet worden verstuurd. Probeer het later opnieuw.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { phone: mobile, resendAfterSeconds: OTP_COOLDOWN_MS / 1000, expiresInSeconds: OTP_TTL_MS[purpose] / 1000 };
  }

  /**
   * Checks a code. Each attempt is counted before the comparison (no parallel guessing past the limit). On success
   * `onSuccess` is written in the same conditional update that makes the code single-use, and the row is returned.
   */
  async verify(
    purpose: OtpPurpose,
    mobile: string,
    code: string,
    onSuccess: Prisma.PhoneVerificationUpdateManyMutationInput,
    external?: ExternalVerifier,
  ): Promise<PhoneVerification> {
    const invalid = () => new BadRequestException({ code: 'OTP_INVALID', message: 'Ongeldige of verlopen code' });
    const row = await this.prisma.phoneVerification.findUnique({ where: { mobile_purpose: { mobile, purpose } } });
    if (!row || row.verifiedAt || row.consumedAt || row.expiresAt < new Date() || !/^\d{6}$/.test(code)) throw invalid();

    const { count } = await this.prisma.phoneVerification.updateMany({
      where: { id: row.id, verifiedAt: null, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (count === 0) throw new HttpException({ code: 'OTP_ATTEMPTS', message: 'Te veel pogingen. Vraag een nieuwe code aan.' }, HttpStatus.TOO_MANY_REQUESTS);

    let matches = false;
    if (row.codeHash === PROVIDER_CODE) {
      matches = !!external && (await external.check(mobile, code));
    } else {
      const expected = Buffer.from(row.codeHash, 'hex');
      const actual = Buffer.from(this.hmac(purpose, mobile, code), 'hex');
      matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
    if (!matches) throw invalid();

    const { count: won } = await this.prisma.phoneVerification.updateMany({ where: { id: row.id, verifiedAt: null, consumedAt: null }, data: onSuccess });
    if (won === 0) throw invalid(); // a parallel request used it first
    return row;
  }
}
