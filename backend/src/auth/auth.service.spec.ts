import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuthService, MAX_VERIFICATION_ATTEMPTS, VERIFICATION_CODE_TTL_MS } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_PROVIDER } from '../mail/mail.provider';
import { SMS_VERIFIER } from './sms/sms-verifier';
import { RegisterDto } from './dto/register.dto';

// bcrypt is a native module; a deterministic fake keeps this suite portable across OS/CI images.
// Hash-format and cost-factor behaviour is bcrypt's own responsibility, not under test here.
jest.mock('bcrypt', () => ({
  hash: async (plain: string) => `fake$${Buffer.from(plain).toString('base64')}`,
  compare: async (plain: string, hash: string) => hash === `fake$${Buffer.from(plain).toString('base64')}`,
}));

const SECRET = 'x'.repeat(48);

function hashFor(userId: string, code: string) {
  return crypto.createHmac('sha256', SECRET).update(`otp:${userId}:${code}`).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  const mail = { isConfigured: jest.fn(), supports: jest.fn(), send: jest.fn() };
  const sms = { isConfigured: jest.fn(), start: jest.fn(), check: jest.fn() };
  let emailOk: jest.SpyInstance;
  const jwt = { sign: jest.fn(() => 'signed.jwt.token'), decode: jest.fn() };

  const baseUser = {
    id: 'u1',
    email: 'sophie@example.nl',
    mobile: null,
    username: null,
    passwordHash: '',
    role: UserRole.CONSUMER,
    status: UserStatus.ACTIVE,
    verificationCode: null,
    verificationCodeExpiresAt: null,
    verificationAttempts: 0,
    emailVerifiedAt: null,
    mobileVerifiedAt: null,
    createdAt: new Date(),
    consumerProfile: { id: 'cp1', displayName: 'Sophie' },
    businessOwnerProfile: null,
  };

  beforeAll(async () => {
    baseUser.passwordHash = await bcrypt.hash('Correct-Horse-1', 4);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mail.isConfigured.mockReturnValue(true);
    mail.supports.mockReturnValue(true);
    mail.send.mockResolvedValue(undefined);
    sms.isConfigured.mockReturnValue(false);
    sms.start.mockResolvedValue(undefined);
    prisma = {
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      consumerProfile: { create: jest.fn(), delete: jest.fn() },
      businessOwnerProfile: { create: jest.fn(), upsert: jest.fn() },
      passwordResetToken: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[])));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => SECRET, get: (k: string) => (k === 'CORS_ORIGIN' ? 'http://localhost:3000' : undefined) } },
        { provide: MAIL_PROVIDER, useValue: mail },
        { provide: SMS_VERIFIER, useValue: sms },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    // No real DNS in unit tests; the domain check is exercised separately.
    emailOk = jest.spyOn(service as unknown as { emailDomainAcceptsMail: () => Promise<boolean> }, 'emailDomainAcceptsMail').mockResolvedValue(true);
  });

  describe('RegisterDto role restriction', () => {
    it.each([['SUPER_ADMIN', false], ['CONSUMER', true], ['BUSINESS_OWNER', true]])('role %s valid=%s', async (role, valid) => {
      const dto = plainToInstance(RegisterDto, { email: 'a@b.nl', password: 'Password1', role, displayName: 'A' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'role')).toBe(!valid);
    });
  });

  describe('sign-up: phone OTP first, then the account', () => {
    // In-memory stand-ins for the two tables sign-up touches, honouring the conditional where-clauses
    // the service relies on (so cooldown, replay and race behaviour is really exercised).
    type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    let verifications: Row[];
    let users: Row[];
    const fits = (row: Row, where: Row): boolean =>
      Object.entries(where).every(([k, cond]) => {
        const v = row[k];
        if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
          if ('not' in cond) return v !== cond.not;
          if ('gt' in cond) return v > cond.gt;
          if ('lt' in cond) return v < cond.lt;
          if ('lte' in cond) return v <= cond.lte;
          if ('equals' in cond) return String(v ?? '').toLowerCase() === String(cond.equals).toLowerCase();
        }
        return v === cond;
      });
    const apply = (row: Row, data: Row) => {
      for (const [k, v] of Object.entries(data)) row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v;
    };
    const p2002 = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

    const PHONE = '06 12345678';
    const MOBILE = '+31612345678';
    const STRONG = 'Sterk-Wachtw00rd';
    const dto = (token: string, extra: Record<string, unknown> = {}) =>
      ({ email: 'New@Example.nl', phone: PHONE, password: STRONG, role: UserRole.CONSUMER, displayName: 'Jan', acceptTerms: true, phoneVerificationToken: token, ...extra }) as RegisterDto;
    /** The code the dev SMS channel (mail provider) delivered last. */
    const lastCode = () => /(\d{6})/.exec(mail.send.mock.calls.at(-1)[0].text)![1];
    const verified = async (phone = PHONE) => {
      await service.sendSignupCode(phone);
      return (await service.verifySignupCode(phone, lastCode())).verificationToken;
    };
    const age = (ms: number) => {
      const row = verifications[0];
      row.lastSentAt = new Date(row.lastSentAt.getTime() - ms);
      row.sendWindowStart = new Date(row.sendWindowStart.getTime() - ms);
    };

    beforeEach(() => {
      verifications = [];
      users = [{ id: 'old', email: 'taken@example.nl', mobile: '+31600000000' }];
      prisma.phoneVerification = {
        findUnique: jest.fn(async ({ where }) => verifications.find((r) => fits(r, where)) ?? null),
        findFirst: jest.fn(async ({ where }) => verifications.find((r) => fits(r, where)) ?? null),
        create: jest.fn(async ({ data }) => {
          if (verifications.some((r) => r.mobile === data.mobile)) throw p2002();
          const row = { id: `v${verifications.length + 1}`, ...data };
          verifications.push(row);
          return row;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const hit = verifications.filter((r) => fits(r, where));
          hit.forEach((r) => apply(r, data));
          return { count: hit.length };
        }),
        deleteMany: jest.fn(async ({ where }) => {
          const before = verifications.length;
          verifications = verifications.filter((r) => !fits(r, where));
          return { count: before - verifications.length };
        }),
      };
      prisma.user.findMany = jest.fn(async ({ where }) => users.filter((u) => where.OR.some((w: Row) => fits(u, w))));
      prisma.user.create = jest.fn(async ({ data }) => {
        // The database's unique constraints on users.email and users.mobile.
        if (users.some((u) => u.email === data.email || u.mobile === data.mobile)) throw p2002();
        const user = { ...baseUser, id: `u${users.length + 1}`, ...data };
        users.push(user);
        return user;
      });
      prisma.user.findUniqueOrThrow = jest.fn(async ({ where }) => ({ ...users.find((u) => u.id === where.id), consumerProfile: { id: 'cp', displayName: 'Jan' }, businessOwnerProfile: null }));
    });

    it('1. new e-mail + new number: account created after the code, active, mobile verified, session issued', async () => {
      const token = await verified();
      expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: MOBILE, channel: 'SMS' }));
      expect(verifications[0].codeHash).not.toContain(lastCode()); // only the HMAC is stored
      const res = await service.register(dto(token));
      expect(res.accessToken).toBe('signed.jwt.token');
      const created = users.at(-1)!;
      expect(created).toMatchObject({ email: 'new@example.nl', mobile: MOBILE, status: UserStatus.ACTIVE });
      expect(created.mobileVerifiedAt).toBeInstanceOf(Date);
      expect(verifications).toHaveLength(0); // the verification is consumed
    });

    it.each([
      ['2. existing e-mail', { email: 'TAKEN@example.nl' }, PHONE, 'EMAIL_EXISTS'],
      ['3. existing number', {}, '+31600000000', 'MOBILE_EXISTS'],
      ['4. existing e-mail and number', { email: 'taken@example.nl' }, '+31600000000', 'ACCOUNT_EXISTS'],
    ])('%s: rejected with its own message, nothing created', async (_name, extra, phone, code) => {
      const token = await verified(phone);
      await expect(service.register(dto(token, { phone, ...extra }))).rejects.toMatchObject({ status: 409, response: { code } });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('5. a wrong code is rejected and counted; the 6th try is refused even with the right code', async () => {
      await service.sendSignupCode(PHONE);
      const good = lastCode();
      const bad = good === '000000' ? '111111' : '000000';
      for (let i = 0; i < MAX_VERIFICATION_ATTEMPTS; i++) {
        await expect(service.verifySignupCode(PHONE, bad)).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
      }
      await expect(service.verifySignupCode(PHONE, good)).rejects.toMatchObject({ status: 429, response: { code: 'OTP_ATTEMPTS' } });
    });

    it('6. an expired code is rejected', async () => {
      await service.sendSignupCode(PHONE);
      verifications[0].expiresAt = new Date(Date.now() - 1);
      await expect(service.verifySignupCode(PHONE, lastCode())).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    });

    it('7. a code can be used once; a token can create one account', async () => {
      await service.sendSignupCode(PHONE);
      const code = lastCode();
      const { verificationToken } = await service.verifySignupCode(PHONE, code);
      await expect(service.verifySignupCode(PHONE, code)).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
      await service.register(dto(verificationToken));
      await expect(service.register(dto(verificationToken, { email: 'other@example.nl' }))).rejects.toMatchObject({ response: { code: 'PHONE_NOT_VERIFIED' } });
    });

    it('8. a new code within 60 s is refused by the server', async () => {
      await service.sendSignupCode(PHONE);
      age(30_000);
      await expect(service.sendSignupCode(PHONE)).rejects.toMatchObject({ status: 429, response: { code: 'OTP_COOLDOWN' } });
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('9. after 60 s a new code is sent (old one invalid), up to 5 per hour per number', async () => {
      await service.sendSignupCode(PHONE);
      const first = lastCode();
      for (let i = 2; i <= 5; i++) {
        verifications[0].lastSentAt = new Date(verifications[0].lastSentAt.getTime() - 61_000);
        await service.sendSignupCode(PHONE);
      }
      expect(mail.send).toHaveBeenCalledTimes(5);
      if (lastCode() !== first) await expect(service.verifySignupCode(PHONE, first)).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
      verifications[0].lastSentAt = new Date(verifications[0].lastSentAt.getTime() - 61_000);
      verifications[0].attempts = 0;
      await expect(service.sendSignupCode(PHONE)).rejects.toMatchObject({ status: 429, response: { code: 'OTP_LIMIT' } });
      age(60 * 60_000); // a new hour
      await expect(service.sendSignupCode(PHONE)).resolves.toMatchObject({ phone: MOBILE });
    });

    it('15. parallel sign-ups: one token creates one account; two numbers racing for one e-mail create one account', async () => {
      const token = await verified();
      // Different e-mails: consuming the token, and failing that the unique mobile number, stop the second one.
      const same = await Promise.allSettled([service.register(dto(token, { email: 'a1@example.nl' })), service.register(dto(token, { email: 'a2@example.nl' }))]);
      expect(same.filter((r) => r.status === 'fulfilled')).toHaveLength(1);

      const t1 = await verified('+31611111111');
      const t2 = await verified('+31622222222');
      const race = await Promise.allSettled([
        service.register(dto(t1, { phone: '+31611111111', email: 'race@example.nl' })),
        service.register(dto(t2, { phone: '+31622222222', email: 'race@example.nl' })),
      ]);
      expect(race.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(race.find((r) => r.status === 'rejected')).toMatchObject({ reason: { status: 409, response: { code: 'EMAIL_EXISTS' } } });
      expect(users.filter((u) => u.email === 'race@example.nl')).toHaveLength(1);
    });

    it('16. an unverified number (no or a made-up token) cannot sign up', async () => {
      await service.sendSignupCode(PHONE);
      await expect(service.register(dto('made-up-token'))).rejects.toMatchObject({ response: { code: 'PHONE_NOT_VERIFIED' } });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects a mistyped e-mail domain, and a number without country code before sending anything', async () => {
      const token = await verified();
      emailOk.mockResolvedValueOnce(false);
      await expect(service.register(dto(token))).rejects.toMatchObject({ response: { code: 'EMAIL_INVALID' } });
      await expect(service.sendSignupCode('6374174789')).rejects.toMatchObject({ response: { code: 'PHONE_FORMAT' } });
    });

    it('with Twilio Verify the provider sends and checks the code; we store no code', async () => {
      sms.isConfigured.mockReturnValue(true);
      sms.check.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      await service.sendSignupCode(PHONE);
      expect(sms.start).toHaveBeenCalledWith(MOBILE);
      expect(mail.send).not.toHaveBeenCalled();
      expect(verifications[0].codeHash).toBe('sms-provider');
      await expect(service.verifySignupCode(PHONE, '000000')).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
      await expect(service.verifySignupCode(PHONE, '123456')).resolves.toMatchObject({ phone: MOBILE });
      expect(sms.check).toHaveBeenLastCalledWith(MOBILE, '123456');
    });

    it('refuses to send while no SMS channel exists (503)', async () => {
      mail.supports.mockImplementation((channel: string) => channel === 'EMAIL');
      await expect(service.sendSignupCode(PHONE)).rejects.toMatchObject({ status: 503 });
      expect(verifications).toHaveLength(0);
    });
  });

  describe('RegisterDto password rules (10-13)', () => {
    it.each([
      ['no uppercase', 'sterk-wachtw00rd'],
      ['no lowercase', 'STERK-WACHTW00RD'],
      ['no number', 'Sterk-Wachtwoord'],
      ['no special character', 'SterkWachtw00rd'],
      ['too short', 'Aa1-aaa'],
    ])('%s is rejected', async (_name, password) => {
      const errors = await validate(plainToInstance(RegisterDto, { email: 'a@b.nl', phone: '+31612345678', password, role: 'CONSUMER', displayName: 'A', acceptTerms: true, phoneVerificationToken: 't' }));
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('a password meeting every rule passes', async () => {
      const errors = await validate(plainToInstance(RegisterDto, { email: 'a@b.nl', phone: '+31612345678', password: 'Sterk-Wachtw00rd', role: 'CONSUMER', displayName: 'A', acceptTerms: true, phoneVerificationToken: 't' }));
      expect(errors).toEqual([]);
    });
  });

  describe('becomeOwner', () => {
    it('switches a customer to shop owner, keeps the customer profile, and issues a new session', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, mobile: '+31612345678', isGuest: false, employeeships: [], consumerProfile: { displayName: 'Sophie', phone: '+31612345678' } });
      prisma.user.update.mockResolvedValue({ ...baseUser, role: UserRole.BUSINESS_OWNER, consumerProfile: null, businessOwnerProfile: { id: 'bp1', displayName: 'Sophie' } });
      const res = await service.becomeOwner('u1');
      expect(prisma.businessOwnerProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ userId: 'u1', displayName: 'Sophie', phone: '+31612345678' }) }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: UserRole.BUSINESS_OWNER } }));
      expect(prisma.consumerProfile.delete).not.toHaveBeenCalled();
      expect(res.user.role).toBe(UserRole.BUSINESS_OWNER);
      expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.BUSINESS_OWNER }));
    });

    it('refuses guests, non-customers and active shop staff', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, isGuest: true, employeeships: [] });
      await expect(service.becomeOwner('u1')).rejects.toThrow(ForbiddenException);
      prisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, role: UserRole.BUSINESS_OWNER, isGuest: false, employeeships: [] });
      await expect(service.becomeOwner('u1')).rejects.toThrow(ForbiddenException);
      prisma.user.findUnique.mockResolvedValueOnce({ ...baseUser, isGuest: false, employeeships: [{ id: 'e1' }] });
      await expect(service.becomeOwner('u1')).rejects.toMatchObject({ response: { code: 'ACTIVE_EMPLOYEE' } });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    const pending = (code: string, extra: Record<string, unknown> = {}) => ({
      ...baseUser,
      status: UserStatus.PENDING_VERIFICATION,
      verificationCode: hashFor('u1', code),
      verificationCodeExpiresAt: new Date(Date.now() + 60_000),
      ...extra,
    });

    it('activates the account on the right code and returns a token for cookie use', async () => {
      prisma.user.findFirst.mockResolvedValue(pending('123456'));
      prisma.user.update.mockResolvedValue({ ...baseUser, status: UserStatus.ACTIVE });
      const res = await service.verifyCode('sophie@example.nl', '123456');
      expect(res.accessToken).toBe('signed.jwt.token');
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', role: UserRole.CONSUMER });
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: UserStatus.ACTIVE, verificationCode: null }) }));
    });

    it('counts wrong attempts and rejects', async () => {
      prisma.user.findFirst.mockResolvedValue(pending('123456'));
      await expect(service.verifyCode('sophie@example.nl', '000000')).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { verificationAttempts: { increment: 1 } } });
    });

    it('burns the code after too many attempts (429) even if the code is right', async () => {
      prisma.user.findFirst.mockResolvedValue(pending('123456', { verificationAttempts: MAX_VERIFICATION_ATTEMPTS }));
      await expect(service.verifyCode('sophie@example.nl', '123456')).rejects.toMatchObject({ status: 429 });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { verificationCode: null, verificationCodeExpiresAt: null } });
    });

    it('rejects expired codes and already-active accounts', async () => {
      prisma.user.findFirst.mockResolvedValue(pending('123456', { verificationCodeExpiresAt: new Date(Date.now() - 1000) }));
      await expect(service.verifyCode('x', '123456')).rejects.toThrow(BadRequestException);
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, status: UserStatus.ACTIVE });
      await expect(service.verifyCode('x', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerificationCode', () => {
    const pendingIssued = (msAgo: number) => ({
      ...baseUser,
      status: UserStatus.PENDING_VERIFICATION,
      verificationCode: 'x',
      verificationCodeExpiresAt: new Date(Date.now() - msAgo + VERIFICATION_CODE_TTL_MS),
    });

    it('sends nothing within 60 s of the previous code, with the same generic answer', async () => {
      prisma.user.findFirst.mockResolvedValue(pendingIssued(20_000));
      const res = await service.resendVerificationCode('sophie@example.nl');
      expect(res.message).toEqual(expect.any(String));
      expect(mail.send).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('issues a new code once 60 s have passed', async () => {
      prisma.user.findFirst.mockResolvedValue(pendingIssued(61_000));
      prisma.user.update.mockResolvedValue({});
      await service.resendVerificationCode('sophie@example.nl');
      expect(mail.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('logs in by email or username and never exposes the password hash', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, username: 'owner' });
      prisma.user.update.mockResolvedValue({});
      const res = await service.login({ identifier: 'owner', password: 'Correct-Horse-1' });
      expect(res.user).toMatchObject({ id: 'u1', username: 'owner', role: UserRole.CONSUMER, profileId: 'cp1' });
      expect(JSON.stringify(res.user)).not.toContain('passwordHash');
      expect(prisma.user.findFirst.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([{ username: { equals: 'owner', mode: 'insensitive' } }]));
    });

    it('uses the same generic error for unknown users and wrong passwords', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.login({ identifier: 'ghost@x.nl', password: 'whatever1' })).rejects.toThrow(new UnauthorizedException('Ongeldige inloggegevens'));
      prisma.user.findFirst.mockResolvedValueOnce(baseUser);
      await expect(service.login({ identifier: 'sophie@example.nl', password: 'wrong-password' })).rejects.toThrow(new UnauthorizedException('Ongeldige inloggegevens'));
    });

    it('blocks suspended and unverified accounts (after a correct password)', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, status: UserStatus.SUSPENDED });
      await expect(service.login({ identifier: 'a', password: 'Correct-Horse-1' })).rejects.toThrow(UnauthorizedException);
      prisma.user.findFirst.mockResolvedValueOnce({ ...baseUser, status: UserStatus.PENDING_VERIFICATION });
      await expect(service.login({ identifier: 'a', password: 'Correct-Horse-1' })).rejects.toThrow(/niet geverifieerd/);
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('never returns the reset token; it is only delivered via the mail provider and stored hashed', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      const res = await service.forgotPassword({ email: 'sophie@example.nl' });
      expect(JSON.stringify(res)).not.toMatch(/token/i);
      const sent = mail.send.mock.calls[0][0] as { text: string };
      const token = /token=([a-f0-9]{64})/.exec(sent.text)![1];
      const stored = prisma.passwordResetToken.create.mock.calls[0][0].data;
      expect(stored.tokenHash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
      expect(stored.tokenHash).not.toBe(token);
    });

    it('answers identically for unknown e-mail addresses and fails closed without a provider', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const res = await service.forgotPassword({ email: 'ghost@example.nl' });
      expect(res.message).toMatch(/Als de e-mail bekend is/);
      mail.isConfigured.mockReturnValue(false);
      await expect(service.forgotPassword({ email: 'a@b.nl' })).rejects.toThrow(HttpException);
    });

    it('rejects invalid/expired reset tokens and resets with a valid one', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);
      await expect(service.resetPassword({ token: 'bad', newPassword: 'NewPassword1' })).rejects.toThrow(BadRequestException);
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce({ id: 't1', userId: 'u1' });
      await expect(service.resetPassword({ token: 'good', newPassword: 'NewPassword1' })).resolves.toMatchObject({ message: expect.any(String) });
    });
  });

  it('sessionMaxAgeMs derives the cookie lifetime from the token expiry', () => {
    jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const ms = service.sessionMaxAgeMs('t');
    expect(ms).toBeGreaterThan(3_500_000);
    expect(ms).toBeLessThanOrEqual(3_600_000);
  });

});
