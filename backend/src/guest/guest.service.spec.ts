import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { GuestService } from './guest.service';
import { GuestLinkService, GUEST_LINK_PURPOSE } from './guest-link.service';

// bcrypt is a native module; hashing itself is not under test here.
jest.mock('bcrypt', () => ({ hash: async () => '$2b$12$mockedhashmockedhashmockedhashmockedhashmockedhash' }));

const SECRET = 'test-secret-test-secret-test-secret';

function setup() {
  const prisma = {
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    user: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    consumerProfile: { create: jest.fn() },
    customerOrder: { findFirst: jest.fn() },
    order: { findFirst: jest.fn() },
  };
  const mail = { isConfigured: jest.fn().mockReturnValue(true), supports: jest.fn().mockReturnValue(true), send: jest.fn().mockResolvedValue(undefined) };
  const config = {
    get: jest.fn((k: string) => (k === 'FRONTEND_URL' ? 'https://app.example' : undefined)),
    getOrThrow: jest.fn(() => SECRET),
  };
  const jwt = new JwtService({ secret: SECRET });
  const links = new GuestLinkService(prisma as never, jwt, config as never);
  const service = new GuestService(prisma as never, jwt, config as never, mail as never, links);
  return { service, links, prisma, mail, jwt };
}

const guestUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  role: UserRole.CONSUMER,
  status: UserStatus.ACTIVE,
  isGuest: true,
  guestEmail: 'jan@example.com',
  email: null,
  verificationCode: null,
  verificationCodeExpiresAt: null,
  verificationAttempts: 0,
  createdAt: new Date(),
  consumerProfile: { id: 'p1', displayName: 'Jan' },
  ...over,
});

describe('GuestService.createGuest', () => {
  it('creates a password-less guest with the e-mail only as contact and records consent', async () => {
    const { service, prisma, jwt } = setup();
    prisma.user.create.mockResolvedValue(guestUser());
    prisma.consumerProfile.create.mockResolvedValue({ id: 'p1', displayName: 'Jan' });

    const res = await service.createGuest({ email: '  Jan@Example.COM ', name: ' Jan ', phone: ' 0612 ', acceptTerms: true });

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ role: UserRole.CONSUMER, isGuest: true, guestEmail: 'jan@example.com', status: UserStatus.ACTIVE });
    expect(data.email).toBeUndefined();
    expect(data.passwordHash).toBeUndefined();
    expect(data.consentAcceptedAt).toBeInstanceOf(Date);
    expect(prisma.consumerProfile.create.mock.calls[0][0].data).toMatchObject({ displayName: 'Jan', phone: '0612' });

    const payload = jwt.verify(res.accessToken) as { sub: string; role: string; purpose?: string; exp: number; iat: number };
    expect(payload).toMatchObject({ sub: 'u1', role: 'CONSUMER' });
    expect(payload.purpose).toBeUndefined();
    expect(payload.exp - payload.iat).toBe(24 * 3600);
    expect(res.user).toMatchObject({ isGuest: true, email: null, profileId: 'p1' });
  });
});

describe('guest order link', () => {
  it('signs a one-purpose 7 day token and only for guests', async () => {
    const { links: service, prisma, jwt } = setup();
    prisma.user.findUnique.mockResolvedValueOnce({ isGuest: true, status: UserStatus.ACTIVE });
    const link = await service.orderLinkFor('u1');
    expect(link).toMatch(/^https:\/\/app\.example\/guest\/orders\?token=/);
    const token = decodeURIComponent(link!.split('token=')[1]);
    const payload = jwt.verify(token) as { purpose: string; sub: string; exp: number; iat: number };
    expect(payload).toMatchObject({ purpose: GUEST_LINK_PURPOSE, sub: 'u1' });
    expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);

    prisma.user.findUnique.mockResolvedValueOnce({ isGuest: false, status: UserStatus.ACTIVE });
    expect(await service.orderLinkFor('u2')).toBeNull();
  });

  it('answers identically for unknown order, wrong e-mail and success; mails only on a match', async () => {
    const { service, prisma, mail } = setup();
    prisma.customerOrder.findFirst.mockResolvedValue(null);
    prisma.order.findFirst.mockResolvedValue(null);
    const unknown = await service.requestOrderLink('jan@example.com', 'NOPE');

    prisma.customerOrder.findFirst.mockResolvedValue({ consumerProfile: { userId: 'u1' } });
    prisma.user.findUnique.mockResolvedValue({ isGuest: true, guestEmail: 'other@example.com', status: UserStatus.ACTIVE });
    const wrongEmail = await service.requestOrderLink('jan@example.com', 'LS-1');
    expect(mail.send).not.toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue({ isGuest: true, guestEmail: 'jan@example.com', status: UserStatus.ACTIVE });
    const ok = await service.requestOrderLink(' Jan@Example.com ', 'LS-1');
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0].to).toBe('jan@example.com');
    expect(unknown).toEqual(wrongEmail);
    expect(wrongEmail).toEqual(ok);
  });

  it('never throws to the caller when mail delivery fails', async () => {
    const { service, prisma, mail } = setup();
    prisma.customerOrder.findFirst.mockResolvedValue({ consumerProfile: { userId: 'u1' } });
    prisma.user.findUnique.mockResolvedValue({ isGuest: true, guestEmail: 'jan@example.com', status: UserStatus.ACTIVE });
    mail.send.mockRejectedValue(new Error('smtp down'));
    await expect(service.requestOrderLink('jan@example.com', 'LS-1')).resolves.toHaveProperty('message');
  });

  it('exchanges a valid link for a 24 h session, and rejects other tokens', async () => {
    const { service, prisma, jwt } = setup();
    const linkToken = jwt.sign({ sub: 'u1', purpose: GUEST_LINK_PURPOSE }, { expiresIn: '7d' });
    prisma.user.findUnique.mockResolvedValue(guestUser());
    const res = await service.startSessionFromLink(linkToken);
    const payload = jwt.verify(res.accessToken) as { purpose?: string; role: string };
    expect(payload.purpose).toBeUndefined();
    expect(payload.role).toBe('CONSUMER');

    // an ordinary session token is not a link
    const session = jwt.sign({ sub: 'u1', role: 'CONSUMER' });
    await expect(service.startSessionFromLink(session)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.startSessionFromLink('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
    // expired
    const expired = jwt.sign({ sub: 'u1', purpose: GUEST_LINK_PURPOSE }, { expiresIn: -10 });
    await expect(service.startSessionFromLink(expired)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses the link once the guest became a real account, or is not active', async () => {
    const { service, prisma, jwt } = setup();
    const token = jwt.sign({ sub: 'u1', purpose: GUEST_LINK_PURPOSE }, { expiresIn: '7d' });
    prisma.user.findUnique.mockResolvedValueOnce(guestUser({ isGuest: false }));
    await expect(service.startSessionFromLink(token)).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.findUnique.mockResolvedValueOnce(guestUser({ status: UserStatus.SUSPENDED }));
    await expect(service.startSessionFromLink(token)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.startSessionFromLink(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('claiming an account', () => {
  const hash = (id: string, code: string) => crypto.createHmac('sha256', SECRET).update(`claim:${id}:${code}`).digest('hex');

  it('startClaim mails a code to the guest address and stores only its hash', async () => {
    const { service, prisma, mail } = setup();
    prisma.user.findUnique.mockResolvedValue(guestUser());
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({});
    await service.startClaim('u1');
    const stored = prisma.user.update.mock.calls[0][0].data.verificationCode as string;
    const code = /(\d{6})/.exec(mail.send.mock.calls[0][0].text)![1];
    expect(stored).toBe(hash('u1', code));
    expect(stored).not.toContain(code);
    expect(mail.send.mock.calls[0][0].to).toBe('jan@example.com');
  });

  it('startClaim refuses real accounts, taken e-mail addresses and missing mail', async () => {
    const { service, prisma, mail } = setup();
    prisma.user.findUnique.mockResolvedValue(guestUser({ isGuest: false }));
    await expect(service.startClaim('u1')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.user.findUnique.mockResolvedValue(guestUser());
    prisma.user.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.startClaim('u1')).rejects.toBeInstanceOf(ConflictException);

    mail.isConfigured.mockReturnValue(false);
    await expect(service.startClaim('u1')).rejects.toMatchObject({ status: 503 });
  });

  it('completeClaim with the right code sets email and password and clears the guest flag', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(
      guestUser({ verificationCode: hash('u1', '123456'), verificationCodeExpiresAt: new Date(Date.now() + 60000) }),
    );
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue(guestUser({ email: 'jan@example.com', isGuest: false, guestEmail: null }));
    const res = await service.completeClaim('u1', '123456', 'Wachtwoord123');
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'jan@example.com', guestEmail: null, isGuest: false, verificationCode: null });
    expect(data.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(data.passwordHash).not.toContain('Wachtwoord123');
    expect(res).toMatchObject({ isGuest: false, email: 'jan@example.com' });
  });

  it('completeClaim rejects wrong, expired and over-tried codes', async () => {
    const { service, prisma } = setup();
    const valid = hash('u1', '123456');
    prisma.user.findUnique.mockResolvedValue(guestUser({ verificationCode: valid, verificationCodeExpiresAt: new Date(Date.now() + 60000) }));
    await expect(service.completeClaim('u1', '000000', 'Wachtwoord123')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ verificationAttempts: { increment: 1 } });

    prisma.user.findUnique.mockResolvedValue(guestUser({ verificationCode: valid, verificationCodeExpiresAt: new Date(Date.now() - 1000) }));
    await expect(service.completeClaim('u1', '123456', 'Wachtwoord123')).rejects.toBeInstanceOf(BadRequestException);

    prisma.user.findUnique.mockResolvedValue(guestUser({ verificationCode: valid, verificationCodeExpiresAt: new Date(Date.now() + 60000), verificationAttempts: 5 }));
    await expect(service.completeClaim('u1', '123456', 'Wachtwoord123')).rejects.toMatchObject({ status: 429 });
  });

  it('completeClaim reports an e-mail that was taken in the meantime (race) as a conflict', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue(
      guestUser({ verificationCode: hash('u1', '123456'), verificationCodeExpiresAt: new Date(Date.now() + 60000) }),
    );
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.completeClaim('u1', '123456', 'Wachtwoord123')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('cleanupIdleGuests', () => {
  it('removes only guests without orders or bookings older than 3 days', async () => {
    const { service, prisma } = setup();
    prisma.user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    prisma.user.deleteMany.mockResolvedValue({ count: 2 });
    const now = new Date('2026-10-21T12:00:00Z');
    expect(await service.cleanupIdleGuests(now)).toEqual({ removed: 2 });
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.isGuest).toBe(true);
    expect(where.createdAt.lt).toEqual(new Date('2026-10-18T12:00:00Z'));
    expect(where.consumerProfile.is).toEqual({ orders: { none: {} }, customerOrders: { none: {} }, workshopBookings: { none: {} } });
    expect(prisma.user.deleteMany.mock.calls[0][0].where).toEqual({ id: { in: ['a', 'b'] }, isGuest: true });
  });

  it('does nothing when there is nothing to remove', async () => {
    const { service, prisma } = setup();
    prisma.user.findMany.mockResolvedValue([]);
    expect(await service.cleanupIdleGuests()).toEqual({ removed: 0 });
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
  });
});
