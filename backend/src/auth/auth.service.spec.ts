import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuthService, MAX_VERIFICATION_ATTEMPTS } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_PROVIDER } from '../mail/mail.provider';
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
  const mail = { isConfigured: jest.fn(), send: jest.fn() };
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
    mail.send.mockResolvedValue(undefined);
    prisma = {
      user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      consumerProfile: { create: jest.fn() },
      businessOwnerProfile: { create: jest.fn() },
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
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('RegisterDto role restriction', () => {
    it.each([['SUPER_ADMIN', false], ['CONSUMER', true], ['BUSINESS_OWNER', true]])('role %s valid=%s', async (role, valid) => {
      const dto = plainToInstance(RegisterDto, { email: 'a@b.nl', password: 'Password1', role, displayName: 'A' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'role')).toBe(!valid);
    });
  });

  describe('register', () => {
    const dto = { email: 'New@Example.nl', password: 'Password1', role: UserRole.CONSUMER, displayName: 'New' } as RegisterDto;

    it('creates a pending user and sends a code that is stored only as an HMAC', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u9' });

      const res = await service.register(dto);

      expect(res).toEqual({ pendingVerification: true, verificationChannel: 'EMAIL', identifier: 'new@example.nl' });
      expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: UserStatus.PENDING_VERIFICATION, role: UserRole.CONSUMER }) });
      const sent = mail.send.mock.calls[0][0] as { text: string };
      const code = /(\d{6})/.exec(sent.text)![1];
      const stored = prisma.user.update.mock.calls[0][0].data;
      expect(stored.verificationCode).toBe(hashFor('u9', code));
      expect(stored.verificationCode).not.toContain(code);
      expect(stored.verificationAttempts).toBe(0);
      expect(res).not.toHaveProperty('user');
    });

    it('does not reveal that an account already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', status: UserStatus.ACTIVE });
      const res = await service.register(dto);
      expect(res).toEqual({ pendingVerification: true, verificationChannel: 'EMAIL', identifier: 'new@example.nl' });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('refuses privileged roles and an unconfigured mail provider', async () => {
      await expect(service.register({ ...dto, role: UserRole.SUPER_ADMIN } as RegisterDto)).rejects.toThrow(BadRequestException);
      mail.isConfigured.mockReturnValue(false);
      await expect(service.register(dto)).rejects.toThrow(HttpException);
      expect(prisma.user.create).not.toHaveBeenCalled();
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

  it('mail provider failure at registration surfaces as 503 only when unconfigured', async () => {
    mail.isConfigured.mockReturnValue(false);
    await expect(service.register({ email: 'a@b.nl', password: 'Password1', role: UserRole.CONSUMER, displayName: 'A' } as RegisterDto)).rejects.toBeInstanceOf(HttpException);
    expect(ServiceUnavailableException).toBeDefined();
  });
});
