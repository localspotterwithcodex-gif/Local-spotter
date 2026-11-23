import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OtpPurpose, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService, OTP_LOGIN_PURPOSE } from './auth.service';

const MOBILE = '+31612345678';
const jwt = new JwtService({ secret: 's'.repeat(48) });

async function make(opts: { mobileVerified?: boolean; role?: UserRole; trustDays?: string; canSend?: boolean } = {}) {
  const user = {
    id: 'u1',
    email: 'sophie@example.nl',
    mobile: MOBILE,
    mobileVerifiedAt: opts.mobileVerified === false ? null : new Date(),
    role: opts.role ?? UserRole.CONSUMER,
    status: UserStatus.ACTIVE,
    sessionVersion: 2,
    isGuest: false,
    passwordHash: await bcrypt.hash('Correct-Horse-1', 4),
    consumerProfile: { id: 'cp1', displayName: 'Sophie' },
    businessOwnerProfile: null,
    mfaEnabledAt: null,
  };
  const prisma = {
    user: { findFirst: jest.fn(async () => user), findUnique: jest.fn(async () => user), update: jest.fn(async () => user) },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  const otp = {
    canSend: jest.fn(() => opts.canSend ?? true),
    send: jest.fn(async () => ({ phone: MOBILE, resendAfterSeconds: 60, expiresInSeconds: 300 })),
    verify: jest.fn(async () => ({ id: 'v1' })),
  };
  const mail = { isConfigured: () => true, send: jest.fn() };
  const config = { get: (k: string) => (k === 'LOGIN_OTP_TRUST_DAYS' ? opts.trustDays : undefined), getOrThrow: () => 's'.repeat(48) };
  const service = new AuthService(prisma as never, jwt, config as never, mail as never, { isConfigured: () => false } as never, otp as never);
  return { service, otp, prisma, mail, user };
}
const login = { identifier: 'sophie@example.nl', password: 'Correct-Horse-1' };

describe('login with an SMS code (8.3)', () => {
  it('a verified mobile gets a code and a short-lived step token, not a session', async () => {
    const { service, otp } = await make();
    const res = await service.login(login, { locale: 'en' });
    expect(res).toMatchObject({ otpRequired: true, phoneHint: '•••• 5678' });
    expect('accessToken' in res).toBe(false);
    expect(otp.send).toHaveBeenCalledWith(OtpPurpose.LOGIN, MOBILE, expect.objectContaining({ userId: 'u1', locale: 'en' }));
    expect(jwt.verify((res as { otpToken: string }).otpToken)).toMatchObject({ sub: 'u1', purpose: OTP_LOGIN_PURPOSE, sv: 2 });
  });

  it('the code turns the step token into a session; a wrong code or a revoked/forged token does not', async () => {
    const { service, otp, user } = await make();
    const { otpToken } = (await service.login(login)) as { otpToken: string };
    await expect(service.verifyLoginOtp(otpToken, '123456')).resolves.toMatchObject({ accessToken: expect.any(String), trustedDevice: null });
    expect(otp.verify).toHaveBeenCalledWith(OtpPurpose.LOGIN, MOBILE, '123456', { consumedAt: expect.any(Date) }, undefined);
    otp.verify.mockRejectedValueOnce(new HttpException({ code: 'OTP_INVALID' }, HttpStatus.BAD_REQUEST));
    await expect(service.verifyLoginOtp(otpToken, '000000')).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    const session = jwt.sign({ sub: 'u1', role: 'CONSUMER', sv: 2 });
    await expect(service.verifyLoginOtp(session, '123456')).rejects.toBeInstanceOf(UnauthorizedException);
    user.sessionVersion = 3; // password reset since the token was issued
    await expect(service.verifyLoginOtp(otpToken, '123456')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a second login within the cooldown still asks for the code that was just sent', async () => {
    const { service, otp } = await make();
    otp.send.mockRejectedValueOnce(new HttpException({ code: 'OTP_COOLDOWN' }, HttpStatus.TOO_MANY_REQUESTS));
    await expect(service.login(login)).resolves.toMatchObject({ otpRequired: true });
  });

  it('no code for admins (authenticator app, D9) or accounts without a verified mobile (D-013)', async () => {
    for (const o of [{ role: UserRole.SUPER_ADMIN }, { mobileVerified: false }]) {
      const { service, otp } = await make(o);
      await expect(service.login(login)).resolves.toMatchObject({ accessToken: expect.any(String) });
      expect(otp.send).not.toHaveBeenCalled();
    }
  });

  it('LOGIN_OTP_TRUST_DAYS: a trusted-device token skips the code until it expires or sessions are revoked', async () => {
    const { service, otp, user } = await make({ trustDays: '30' });
    const { otpToken } = (await service.login(login)) as { otpToken: string };
    const { trustedDevice, trustedDeviceMaxAgeMs } = await service.verifyLoginOtp(otpToken, '123456');
    expect(trustedDeviceMaxAgeMs).toBe(30 * 86_400_000);
    otp.send.mockClear();
    await expect(service.login(login, { trustedDevice: trustedDevice! })).resolves.toMatchObject({ accessToken: expect.any(String) });
    expect(otp.send).not.toHaveBeenCalled();
    user.sessionVersion = 3;
    await expect(service.login(login, { trustedDevice: trustedDevice! })).resolves.toMatchObject({ otpRequired: true });
    // Default (0): never trusted, even with a cookie.
    const def = await make();
    await expect(def.service.login(login, { trustedDevice: trustedDevice! })).resolves.toMatchObject({ otpRequired: true });
  });
});

describe('password reset with an SMS code (8.3)', () => {
  it('a verified mobile gets a code, by phone or e-mail, with the same answer as an unknown account', async () => {
    const { service, otp, mail, prisma } = await make();
    const byPhone = await service.forgotPassword({ identifier: '06 12345678' });
    const byEmail = await service.forgotPassword({ email: 'sophie@example.nl' });
    expect(otp.send).toHaveBeenCalledTimes(2);
    expect(otp.send).toHaveBeenCalledWith(OtpPurpose.PASSWORD_RESET, MOBILE, expect.objectContaining({ userId: 'u1' }));
    expect(mail.send).not.toHaveBeenCalled();
    prisma.user.findFirst.mockResolvedValueOnce(null as never);
    const unknown = await service.forgotPassword({ identifier: 'ghost@example.nl' });
    expect(byPhone).toEqual(unknown);
    expect(byEmail).toEqual(unknown);
  });

  it('a failed or limited SMS does not reveal the account either', async () => {
    const { service, otp } = await make();
    otp.send.mockRejectedValueOnce(new HttpException({ code: 'OTP_LIMIT' }, HttpStatus.TOO_MANY_REQUESTS));
    await expect(service.forgotPassword({ identifier: MOBILE })).resolves.toMatchObject({ message: expect.stringMatching(/Als het account/) });
  });

  it('without a verified mobile the e-mail link is the fallback', async () => {
    const { service, otp, mail } = await make({ mobileVerified: false });
    await service.forgotPassword({ email: 'sophie@example.nl' });
    expect(otp.send).not.toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ channel: 'EMAIL', to: 'sophie@example.nl' }));
  });

  it('a correct code gives a one-time reset token (10 min); no account or no verified mobile gives OTP_INVALID', async () => {
    const { service, otp, prisma } = await make();
    const { resetToken } = await service.verifyResetCode(MOBILE, '123456');
    expect(resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(otp.verify).toHaveBeenCalledWith(OtpPurpose.PASSWORD_RESET, MOBILE, '123456', { consumedAt: expect.any(Date) }, undefined);
    const created = prisma.passwordResetToken.create.mock.calls[0][0] as { data: { tokenHash: string; expiresAt: Date } };
    expect(created.data.tokenHash).not.toContain(resetToken);
    expect(created.data.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(10 * 60_000);
    prisma.user.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.verifyResetCode('ghost@example.nl', '123456')).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
    const noMobile = await make({ mobileVerified: false });
    await expect(noMobile.service.verifyResetCode(MOBILE, '123456')).rejects.toMatchObject({ response: { code: 'OTP_INVALID' } });
  });
});
