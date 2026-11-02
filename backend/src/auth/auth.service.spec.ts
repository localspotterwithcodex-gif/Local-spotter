import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
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

  describe('register (mobile + e-mail, SMS code)', () => {
    const dto = { email: 'New@Example.nl', phone: '06 12345678', password: 'Password1', role: UserRole.CONSUMER, displayName: 'Jan' } as RegisterDto;
    const smsUser = (extra: Record<string, unknown> = {}) => ({
      ...baseUser,
      email: 'new@example.nl',
      mobile: '+31612345678',
      status: UserStatus.PENDING_VERIFICATION,
      verificationCode: 'sms-provider',
      verificationCodeExpiresAt: new Date(Date.now() + 60_000),
      ...extra,
    });

    beforeEach(() => {
      sms.isConfigured.mockReturnValue(true);
      mail.supports.mockImplementation((channel: string) => channel === 'EMAIL');
    });

    it('stores both contact details, the number in international format, and lets the SMS provider send the code', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u9' });
      const res = await service.register(dto);
      expect(res).toEqual({ pendingVerification: true, verificationChannel: 'MOBILE', identifier: '+31612345678' });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'new@example.nl', mobile: '+31612345678', status: UserStatus.PENDING_VERIFICATION, role: UserRole.CONSUMER }),
      });
      expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ verificationCode: 'sms-provider', verificationAttempts: 0 });
      expect(sms.start).toHaveBeenCalledWith('+31612345678');
      expect(mail.send).not.toHaveBeenCalled();
      expect(res).not.toHaveProperty('user');
    });

    it('rejects an e-mail domain that cannot receive mail, before creating anything', async () => {
      emailOk.mockResolvedValueOnce(false);
      await expect(service.register(dto)).rejects.toMatchObject({ response: { code: 'EMAIL_INVALID' } });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(sms.start).not.toHaveBeenCalled();
    });

    it('asks for a country code instead of guessing one', async () => {
      await expect(service.register({ ...dto, phone: '6374174789' } as RegisterDto)).rejects.toMatchObject({ response: { code: 'PHONE_FORMAT' } });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('does not reveal that an account exists; the owner is told on the matching contact detail', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', status: UserStatus.ACTIVE, email: 'new@example.nl', mobile: '+31600000000', verificationCodeExpiresAt: null });
      const res = await service.register(dto);
      expect(res).toEqual({ pendingVerification: true, verificationChannel: 'MOBILE', identifier: '+31612345678' });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@example.nl', channel: 'EMAIL' }));
      expect(sms.start).not.toHaveBeenCalled();
    });

    it('refuses privileged roles, and refuses sign-up while no SMS can be sent', async () => {
      await expect(service.register({ ...dto, role: UserRole.SUPER_ADMIN } as RegisterDto)).rejects.toThrow(BadRequestException);
      sms.isConfigured.mockReturnValue(false);
      await expect(service.register(dto)).rejects.toMatchObject({ status: 503 });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('verifies through the provider, marks only the mobile number verified, and counts every attempt', async () => {
      prisma.user.findFirst.mockResolvedValue(smsUser());
      prisma.user.update.mockResolvedValue({ ...baseUser, status: UserStatus.ACTIVE });
      sms.check.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      await expect(service.verifyCode('06 12345678', '000000')).rejects.toThrow(BadRequestException);
      await expect(service.verifyCode('06 12345678', '123456')).resolves.toMatchObject({ accessToken: 'signed.jwt.token' });
      expect(sms.check).toHaveBeenLastCalledWith('+31612345678', '123456');
      const activation = prisma.user.update.mock.calls.find((c: Array<{ data: { status?: string } }>) => c[0].data.status === UserStatus.ACTIVE)[0].data;
      expect(activation.mobileVerifiedAt).toBeInstanceOf(Date);
      expect(activation.emailVerifiedAt).toBeNull(); // e-mail was not verified by this code
    });

    it('finds the account whether the number is typed as 06... or +31...', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await service.resendVerificationCode('06 1234 5678');
      expect(prisma.user.findFirst.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([{ mobile: '+31612345678' }]));
    });

    it('sends no second paid SMS within 60 s, also when someone re-registers the same number', async () => {
      prisma.user.findFirst.mockResolvedValue(smsUser({ verificationCodeExpiresAt: new Date(Date.now() + 10 * 60_000 - 5_000) }));
      await service.register(dto);
      await service.resendVerificationCode('+31612345678');
      expect(sms.start).not.toHaveBeenCalled();
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

  it('sign-up surfaces as 503 when no SMS can be delivered (no provider, mail provider without SMS)', async () => {
    mail.supports.mockImplementation((channel: string) => channel === 'EMAIL');
    await expect(
      service.register({ email: 'a@b.nl', phone: '+31612345678', password: 'Password1', role: UserRole.CONSUMER, displayName: 'A' } as RegisterDto),
    ).rejects.toBeInstanceOf(HttpException);
    expect(ServiceUnavailableException).toBeDefined();
  });
});
