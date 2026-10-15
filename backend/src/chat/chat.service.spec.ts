import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ChatService } from './chat.service';

const consumer = { id: 'u1', role: UserRole.CONSUMER, profileId: 'c1' } as any;
const otherConsumer = { id: 'u2', role: UserRole.CONSUMER, profileId: 'c2' } as any;
const owner = { id: 'u3', role: UserRole.BUSINESS_OWNER, profileId: 'o1' } as any;
const otherOwner = { id: 'u4', role: UserRole.BUSINESS_OWNER, profileId: 'o2' } as any;
const admin = { id: 'a1', role: UserRole.SUPER_ADMIN } as any;

function make() {
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', status: 'ACTIVE', deletedAt: null }) },
    conversation: {
      upsert: jest.fn().mockResolvedValue({ id: 'cv1' }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'cv1',
        consumerProfileId: 'c1',
        business: { name: 'Shop', ownerProfileId: 'o1' },
        consumerProfile: { displayName: 'Sophie' },
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnValue('upd'),
    },
    chatMessage: {
      findMany: jest.fn().mockResolvedValue([{ id: 'm2', body: 'b', senderUserId: 'u3', createdAt: new Date(), readAt: null }, { id: 'm1', body: 'a', senderUserId: 'u1', createdAt: new Date(), readAt: null }]),
      create: jest.fn().mockReturnValue('crt'),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(3),
    },
    $transaction: jest.fn().mockResolvedValue([{ id: 'm9', body: 'hi', createdAt: new Date(), readAt: null }, {}]),
  };
  return { svc: new ChatService(prisma), prisma };
}

describe('ChatService', () => {
  it('lets a consumer start a conversation with an active shop (upsert, one per pair)', async () => {
    const { svc, prisma } = make();
    expect(await svc.start(consumer, 'b1')).toEqual({ id: 'cv1' });
    expect(prisma.conversation.upsert.mock.calls[0][0].where).toEqual({ consumerProfileId_businessId: { consumerProfileId: 'c1', businessId: 'b1' } });
  });

  it('rejects owners/admins starting a conversation and hides inactive shops', async () => {
    const { svc, prisma } = make();
    await expect(svc.start(owner, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start(admin, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.business.findUnique.mockResolvedValue({ id: 'b1', status: 'SUSPENDED', deletedAt: null });
    await expect(svc.start(consumer, 'b1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows both participants to read, returns oldest first', async () => {
    const { svc } = make();
    for (const u of [consumer, owner]) {
      const out = await svc.messages(u, 'cv1');
      expect(out.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    }
    expect((await svc.messages(consumer, 'cv1')).messages[0].mine).toBe(true);
  });

  it('answers 404 (not 403) to anyone who is not a participant', async () => {
    const { svc } = make();
    for (const u of [otherConsumer, otherOwner, admin]) {
      await expect(svc.messages(u, 'cv1')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.send(u, 'cv1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.markRead(u, 'cv1')).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('validates message bodies and writes message + lastMessageAt atomically', async () => {
    const { svc, prisma } = make();
    await expect(svc.send(consumer, 'cv1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.send(consumer, 'cv1', 'x'.repeat(2001))).rejects.toBeInstanceOf(BadRequestException);
    const out = await svc.send(consumer, 'cv1', '  hi  ');
    expect(out.mine).toBe(true);
    expect(prisma.chatMessage.create.mock.calls[0][0].data).toEqual({ conversationId: 'cv1', senderUserId: 'u1', body: 'hi' });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('marks only the other party’s messages as read', async () => {
    const { svc, prisma } = make();
    await svc.markRead(owner, 'cv1');
    expect(prisma.chatMessage.updateMany.mock.calls[0][0].where).toEqual({ conversationId: 'cv1', readAt: null, senderUserId: { not: 'u3' } });
  });

  it('scopes the list per role', async () => {
    const { svc, prisma } = make();
    await svc.list(consumer);
    expect(prisma.conversation.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    await svc.list(owner);
    expect(prisma.conversation.findMany.mock.calls[1][0].where).toEqual({ business: { ownerProfileId: 'o1' } });
    await expect(svc.list(admin)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
