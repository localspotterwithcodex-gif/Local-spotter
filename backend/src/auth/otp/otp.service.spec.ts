import { OtpPurpose } from '@prisma/client';
import { OtpService, OTP_MAX_PER_DAY, otpText } from './otp.service';

const MOBILE = '+31612345678';

function make(env: Record<string, string> = {}) {
  let rows: any[] = [];
  let dayCount = 0;
  const sent: { to: string; text: string; purpose: string }[] = [];
  const fits = (r: any, w: any) => Object.entries(w).every(([k, v]: [string, any]) => (v && typeof v === 'object' && !(v instanceof Date) ? ('lt' in v ? r[k] < v.lt : 'lte' in v ? r[k] <= v.lte : true) : r[k] === v));
  const prisma = {
    phoneVerification: {
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => r.mobile === where.mobile_purpose.mobile && r.purpose === where.mobile_purpose.purpose) ?? null),
      create: jest.fn(async ({ data }: any) => (rows.push({ id: `v${rows.length + 1}`, ...data }), rows.at(-1))),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = rows.filter((r) => fits(r, where));
        for (const r of hit) for (const [k, v] of Object.entries(data) as [string, any][]) r[k] = v && typeof v === 'object' && 'increment' in v ? r[k] + v.increment : v;
        return { count: hit.length };
      }),
    },
    $queryRaw: jest.fn(async () => [{ count: ++dayCount, reset_at: new Date() }]),
  };
  const sms = { isConfigured: () => true, send: jest.fn(async (m: any) => (sent.push(m), true)) };
  const config = { get: (k: string) => env[k], getOrThrow: () => 'x'.repeat(48) };
  const service = new OtpService(prisma as never, config as never, sms as never);
  const code = () => /(\d{6})/.exec(sent.at(-1)!.text)![1];
  const age = (ms: number) => rows.forEach((r) => ((r.lastSentAt = new Date(r.lastSentAt.getTime() - ms)), (r.sendWindowStart = new Date(r.sendWindowStart.getTime() - ms))));
  return { service, rows: () => rows, sent, code, age, setDay: (n: number) => (dayCount = n) };
}

describe('OtpService', () => {
  it('keeps sign-up, login and reset codes apart for the same number, with their own expiry (5/5/10 min)', async () => {
    const t = make();
    await expect(t.service.send(OtpPurpose.SIGNUP, MOBILE)).resolves.toMatchObject({ expiresInSeconds: 300 });
    await expect(t.service.send(OtpPurpose.LOGIN, MOBILE, { userId: 'u1' })).resolves.toMatchObject({ expiresInSeconds: 300 });
    const loginCode = t.code();
    await expect(t.service.send(OtpPurpose.PASSWORD_RESET, MOBILE, { userId: 'u1' })).resolves.toMatchObject({ expiresInSeconds: 600 });
    expect(t.rows().map((r) => r.purpose)).toEqual(['SIGNUP', 'LOGIN', 'PASSWORD_RESET']);
    // A login code is not a reset code.
    await expect(t.service.verify(OtpPurpose.PASSWORD_RESET, MOBILE, loginCode, { consumedAt: new Date() })).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    await expect(t.service.verify(OtpPurpose.LOGIN, MOBILE, loginCode, { consumedAt: new Date() })).resolves.toMatchObject({ userId: 'u1' });
  });

  it('a code works once; stores only an HMAC; hashes the IP', async () => {
    const t = make();
    await t.service.send(OtpPurpose.LOGIN, MOBILE, { ip: '203.0.113.9' });
    const c = t.code();
    expect(JSON.stringify(t.rows())).not.toContain(c);
    expect(JSON.stringify(t.rows())).not.toContain('203.0.113.9');
    await t.service.verify(OtpPurpose.LOGIN, MOBILE, c, { consumedAt: new Date() });
    await expect(t.service.verify(OtpPurpose.LOGIN, MOBILE, c, { consumedAt: new Date() })).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
  });

  it('caps sends at 10 per number per day', async () => {
    const t = make();
    t.setDay(OTP_MAX_PER_DAY);
    await expect(t.service.send(OtpPurpose.LOGIN, MOBILE)).rejects.toMatchObject({ response: { code: 'OTP_LIMIT' } });
    expect(t.sent).toHaveLength(0);
  });

  it('only sends to allowed country prefixes (SMS_ALLOWED_PREFIXES, default: the sign-up selector)', async () => {
    await expect(make().service.send(OtpPurpose.SIGNUP, '+8613812345678')).rejects.toMatchObject({ response: { code: 'PHONE_COUNTRY_NOT_SUPPORTED' } });
    const nlOnly = make({ SMS_ALLOWED_PREFIXES: '+31' });
    await expect(nlOnly.service.send(OtpPurpose.SIGNUP, '+32470123456')).rejects.toMatchObject({ response: { code: 'PHONE_COUNTRY_NOT_SUPPORTED' } });
    await expect(nlOnly.service.send(OtpPurpose.SIGNUP, MOBILE)).resolves.toBeDefined();
  });

  it('uses OTP_HMAC_SECRET when set (a code made under another key does not verify)', async () => {
    const a = make({ OTP_HMAC_SECRET: 'secret-one-secret-one-secret-one' });
    await a.service.send(OtpPurpose.LOGIN, MOBILE);
    const c = a.code();
    const b = make({ OTP_HMAC_SECRET: 'secret-two-secret-two-secret-two' });
    await b.service.send(OtpPurpose.LOGIN, MOBILE);
    b.rows()[0].codeHash = a.rows()[0].codeHash;
    await expect(b.service.verify(OtpPurpose.LOGIN, MOBILE, c, { consumedAt: new Date() })).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
  });

  it('SMS text: one segment, no emoji, NL or EN', () => {
    for (const [p, l] of [[OtpPurpose.LOGIN, 'nl'], [OtpPurpose.PASSWORD_RESET, 'en']] as const) {
      const text = otpText('123456', p, l);
      expect(text.length).toBeLessThanOrEqual(160);
      expect(/^[\x20-\x7E]+$/.test(text)).toBe(true);
    }
    expect(otpText('123456', OtpPurpose.LOGIN, 'nl')).toBe('LocalSpotter: je code is 123456. Geldig 5 min. Deel deze code met niemand.');
  });
});
