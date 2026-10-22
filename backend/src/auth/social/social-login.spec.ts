import { BadRequestException, ConflictException, HttpException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from '../auth.service';
import { SocialTokenVerifier } from './social-token.verifier';

// bcrypt is a native module; AuthService imports it but social login never calls it.
jest.mock('bcrypt', () => ({ hash: async () => 'h', compare: async () => false }));

const profile = { provider: 'google', providerAccountId: 'g-1', email: 'sophie@example.nl', emailVerified: true, name: 'Sophie Vis' };

function userRow(over: any = {}) {
  return { id: 'u1', email: profile.email, mobile: null, username: null, role: UserRole.CONSUMER, status: UserStatus.ACTIVE, createdAt: new Date(), consumerProfile: { id: 'cp1', displayName: 'Sophie' }, businessOwnerProfile: null, ...over };
}

function makeService() {
  const tx: any = {
    user: { create: jest.fn().mockResolvedValue({ id: 'new' }), findUniqueOrThrow: jest.fn().mockResolvedValue(userRow({ id: 'new' })) },
    oAuthAccount: { create: jest.fn() },
    consumerProfile: { create: jest.fn() },
    businessOwnerProfile: { create: jest.fn() },
  };
  const prisma: any = {
    oAuthAccount: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockReturnValue('link') },
    user: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockReturnValue('upd') },
    $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
  };
  const jwt: any = { sign: jest.fn(() => 'jwt') };
  const svc = new AuthService(prisma, jwt, {} as any, {} as any);
  return { svc, prisma, tx };
}

describe('AuthService.completeSocialLogin', () => {
  it('logs in through an already linked provider account', async () => {
    const { svc, prisma } = makeService();
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user: userRow() });
    const out = await svc.completeSocialLogin(profile);
    expect(out.accessToken).toBe('jwt');
    expect(out.user.role).toBe(UserRole.CONSUMER);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('links the provider to an existing account with the same verified email', async () => {
    const { svc, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(userRow());
    await svc.completeSocialLogin(profile);
    expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({ data: { userId: 'u1', provider: 'google', providerAccountId: 'g-1' } });
  });

  it('clears the password of a pending (pre-registered) account when linking', async () => {
    const { svc, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(userRow({ status: UserStatus.PENDING_VERIFICATION }));
    await svc.completeSocialLogin(profile);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).toBeNull();
    expect(data.status).toBe(UserStatus.ACTIVE);
  });

  it('requires a role for a brand-new user (409 ROLE_REQUIRED)', async () => {
    const { svc } = makeService();
    await expect(svc.completeSocialLogin(profile)).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.completeSocialLogin(profile, UserRole.SUPER_ADMIN)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates user + oauth account + profile for a new consumer or owner', async () => {
    const { svc, tx } = makeService();
    await svc.completeSocialLogin(profile, UserRole.CONSUMER);
    expect(tx.consumerProfile.create).toHaveBeenCalled();
    await svc.completeSocialLogin({ ...profile, providerAccountId: 'g-2' }, UserRole.BUSINESS_OWNER);
    expect(tx.businessOwnerProfile.create).toHaveBeenCalled();
    expect(tx.user.create.mock.calls[0][0].data).not.toHaveProperty('passwordHash');
  });

  it('refuses unverified or missing emails, suspended users and admins', async () => {
    const { svc, prisma } = makeService();
    await expect(svc.completeSocialLogin({ ...profile, emailVerified: false })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.completeSocialLogin({ ...profile, email: null })).rejects.toBeInstanceOf(BadRequestException);
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user: userRow({ status: UserStatus.SUSPENDED }) });
    await expect(svc.completeSocialLogin(profile)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.oAuthAccount.findUnique.mockResolvedValue({ user: userRow({ role: UserRole.SUPER_ADMIN }) });
    await expect(svc.completeSocialLogin(profile)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('SocialTokenVerifier', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const cfg = (values: Record<string, string>) => ({ get: (k: string) => values[k] }) as any;
  const respond = (...bodies: any[]) => {
    const queue = [...bodies];
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => queue.shift() })) as any;
  };

  it('is unavailable (503) when the provider is not configured', async () => {
    const v = new SocialTokenVerifier(cfg({}));
    await expect(v.verify('google', 'x'.repeat(20))).rejects.toBeInstanceOf(HttpException);
  });

  it('accepts a Google token only for our client id and issuer', async () => {
    const v = new SocialTokenVerifier(cfg({ GOOGLE_CLIENT_ID: 'cid' }));
    const good = { aud: 'cid', iss: 'https://accounts.google.com', sub: '1', exp: String(Date.now() / 1000 + 600), email: 'A@B.nl', email_verified: 'true', name: 'A' };
    respond(good);
    expect(await v.verify('google', 'x'.repeat(20))).toMatchObject({ providerAccountId: '1', email: 'a@b.nl', emailVerified: true });
    respond({ ...good, aud: 'other' });
    await expect(v.verify('google', 'x'.repeat(20))).rejects.toBeInstanceOf(UnauthorizedException);
    respond({ ...good, exp: String(Date.now() / 1000 - 10) });
    await expect(v.verify('google', 'x'.repeat(20))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects any provider other than Google', async () => {
    const v = new SocialTokenVerifier(cfg({ GOOGLE_CLIENT_ID: 'cid' }));
    await expect(v.verify('facebook' as never, 'x'.repeat(20))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
