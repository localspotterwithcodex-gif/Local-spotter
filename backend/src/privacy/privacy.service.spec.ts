import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrivacyService } from './privacy.service';

// Native bcrypt is not needed to test the flow: a stand-in compares plain strings.
jest.mock('bcrypt', () => ({ compare: async (plain: string, hash: string) => hash === `hash:${plain}` }));

const consumer = { id: 'u1', role: UserRole.CONSUMER, profileId: 'c1' } as any;
const owner = { id: 'u2', role: UserRole.BUSINESS_OWNER, profileId: 'o1' } as any;
const admin = { id: 'a1', role: UserRole.SUPER_ADMIN } as any;

function make(passwordHash: string | null = null) {
  const del = () => ({ deleteMany: jest.fn().mockResolvedValue({ count: 1 }) });
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', passwordHash, status: 'ACTIVE', email: 'a@x.nl' }), update: jest.fn() },
    notification: { ...del(), findMany: jest.fn().mockResolvedValue([]) },
    oAuthAccount: del(),
    passwordResetToken: del(),
    notificationPreference: del(),
    merchantEmployee: del(),
    favorite: { ...del(), findMany: jest.fn().mockResolvedValue([]) },
    follower: { ...del(), findMany: jest.fn().mockResolvedValue([]) },
    cart: del(),
    conversation: { ...del(), findMany: jest.fn().mockResolvedValue([]) },
    consumerAddress: { updateMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    consumerProfile: { update: jest.fn(), findUnique: jest.fn().mockResolvedValue({ displayName: 'Sophie' }) },
    businessOwnerProfile: { update: jest.fn(), findUnique: jest.fn() },
    business: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    review: { findMany: jest.fn().mockResolvedValue([]) },
    workshopBooking: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(prisma)),
  };
  return { svc: new PrivacyService(prisma), prisma };
}

describe('PrivacyService.exportMyData', () => {
  it('scopes every query to the requester and never returns credentials', async () => {
    const { svc, prisma } = make();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.nl', role: 'CONSUMER' });
    const out: any = await svc.exportMyData(consumer);
    expect(out.account.passwordHash).toBeUndefined();
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: 'u1' });
    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select.passwordHash).toBeUndefined();
    expect(select.verificationCode).toBeUndefined();
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    expect(prisma.review.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    expect(prisma.workshopBooking.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    expect(prisma.conversation.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    expect(prisma.notification.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    expect(out.exportVersion).toBe(1);
  });

  it('exports an owner’s own shops only', async () => {
    const { svc, prisma } = make();
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
    await svc.exportMyData(owner);
    expect(prisma.business.findMany.mock.calls[0][0].where).toEqual({ ownerProfileId: 'o1' });
  });
});

describe('PrivacyService.deleteMyAccount', () => {
  it('requires the DELETE confirmation and refuses admins', async () => {
    const { svc } = make();
    await expect(svc.deleteMyAccount(consumer, 'nope')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.deleteMyAccount(admin, 'DELETE')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires the correct password when the account has one', async () => {
    const hash = 'hash:secret-pass';
    const { svc, prisma } = make(hash);
    await expect(svc.deleteMyAccount(consumer, 'DELETE')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.deleteMyAccount(consumer, 'DELETE', 'wrong')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    await expect(svc.deleteMyAccount(consumer, 'DELETE', 'secret-pass')).resolves.toEqual({ deleted: true });
  });

  it('anonymises the account, blocks sign-in and removes personal data without a retention duty', async () => {
    const { svc, prisma } = make(null);
    await svc.deleteMyAccount(consumer, 'DELETE');
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: 'DELETED', mobile: null, username: null, passwordHash: null });
    expect(data.email).toBe('deleted+u1@deleted.invalid');
    expect(prisma.consumerProfile.update.mock.calls[0][0].data).toMatchObject({ firstName: null, lastName: null, phone: null });
    expect(prisma.consumerAddress.updateMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({ where: { consumerProfileId: 'c1' } });
    expect(prisma.conversation.deleteMany.mock.calls[0][0].where.reports).toEqual({ none: { status: 'OPEN' } });
    expect(prisma.order.findMany).not.toHaveBeenCalled(); // orders are retained, never touched
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('ACCOUNT_DELETED');
  });

  it('blocks owners who still have a shop', async () => {
    const { svc, prisma } = make(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', passwordHash: null, status: 'ACTIVE' });
    prisma.business.count.mockResolvedValue(1);
    await expect(svc.deleteMyAccount(owner, 'DELETE')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
