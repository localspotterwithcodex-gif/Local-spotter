import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatReportReason, ChatReportStatus, NotificationType, UserRole } from '@prisma/client';
import { ChatService } from './chat.service';

const consumer = { id: 'u1', role: UserRole.CONSUMER, profileId: 'c1' } as any;
const otherConsumer = { id: 'u2', role: UserRole.CONSUMER, profileId: 'c2' } as any;
const owner = { id: 'u3', role: UserRole.BUSINESS_OWNER, profileId: 'o1' } as any;
const otherOwner = { id: 'u4', role: UserRole.BUSINESS_OWNER, profileId: 'o2' } as any;
const admin = { id: 'a1', role: UserRole.SUPER_ADMIN } as any;

const baseConversation = {
  id: 'cv1',
  consumerProfileId: 'c1',
  consumerBlockedAt: null,
  businessBlockedAt: null,
  business: { name: 'Shop', ownerProfileId: 'o1', ownerProfile: { userId: 'u3' } },
  consumerProfile: { displayName: 'Sophie', userId: 'u1' },
};

function make(conversation: any = baseConversation) {
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', status: 'ACTIVE', deletedAt: null }) },
    conversation: {
      upsert: jest.fn().mockResolvedValue({ id: 'cv1' }),
      findUnique: jest.fn().mockResolvedValue(conversation),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnValue('upd'),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    chatMessage: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'm2', body: 'b', senderUserId: 'u3', fromBusiness: true, createdAt: new Date(), readAt: null, attachment: null },
        { id: 'm1', body: 'a', senderUserId: 'u1', fromBusiness: false, createdAt: new Date(), readAt: null, attachment: { url: 'https://img/x.jpg' } },
      ]),
      findFirst: jest.fn(),
      create: jest.fn().mockReturnValue('crt'),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(3),
      deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
    },
    chatReport: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'r1' }),
      update: jest.fn().mockResolvedValue({ id: 'r1', status: 'RESOLVED' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn().mockImplementation(async (arg: any) =>
      typeof arg === 'function'
        ? arg(prisma)
        : [{ id: 'm9', body: 'hi', createdAt: new Date(), readAt: null, senderUserId: 'u1', fromBusiness: false }, {}],
    ),
  };
  const notifications = { notifyUser: jest.fn().mockResolvedValue(undefined) };
  const employees = { isActiveStaff: jest.fn().mockResolvedValue(false), canAccessShop: jest.fn().mockResolvedValue(false) };
  const media = { uploadImage: jest.fn().mockResolvedValue({ id: 'asset1', url: 'https://img/new.jpg' }) };
  return { svc: new ChatService(prisma, notifications as any, media as any, employees as any), prisma, notifications, media, employees };
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

  it('allows both participants to read, returns oldest first with attachment urls', async () => {
    const { svc } = make();
    for (const u of [consumer, owner]) {
      const out = await svc.messages(u, 'cv1');
      expect(out.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    }
    const out = await svc.messages(consumer, 'cv1');
    expect(out.messages[0].mine).toBe(true);
    expect(out.messages[0].attachmentUrl).toBe('https://img/x.jpg');
    expect(out.messages[1].attachmentUrl).toBeNull();
    expect(out.conversation.blocked).toBe(false);
  });

  it('answers 404 (not 403) to anyone who is not a participant', async () => {
    const { svc } = make();
    for (const u of [otherConsumer, otherOwner, admin]) {
      await expect(svc.messages(u, 'cv1')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.send(u, 'cv1', 'hi')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.markRead(u, 'cv1')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.setBlocked(u, 'cv1', true)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.report(u, 'cv1', { reason: ChatReportReason.SPAM })).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('validates message bodies and writes message + lastMessageAt atomically', async () => {
    const { svc, prisma } = make();
    await expect(svc.send(consumer, 'cv1', '   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.send(consumer, 'cv1', 'x'.repeat(2001))).rejects.toBeInstanceOf(BadRequestException);
    const out = await svc.send(consumer, 'cv1', '  hi  ');
    expect(out.mine).toBe(true);
    expect(prisma.chatMessage.create.mock.calls[0][0].data).toEqual({ conversationId: 'cv1', senderUserId: 'u1', body: 'hi', fromBusiness: false });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('marks only the other party’s messages as read and re-arms the notification', async () => {
    const { svc, prisma } = make();
    await svc.markRead(owner, 'cv1');
    expect(prisma.chatMessage.updateMany.mock.calls[0][0].where).toEqual({ conversationId: 'cv1', readAt: null, fromBusiness: false });
    expect(prisma.conversation.update.mock.calls[0][0].data).toEqual({ businessNotifiedAt: null });
  });

  it('scopes the list per role', async () => {
    const { svc, prisma } = make();
    await svc.list(consumer);
    expect(prisma.conversation.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'c1' });
    await svc.list(owner);
    expect(prisma.conversation.findMany.mock.calls[1][0].where).toEqual({ business: { ownerProfileId: 'o1' } });
    await expect(svc.list(admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('blocking', () => {
    it('stores each side’s block separately and lets only the blocker lift it', async () => {
      const { svc, prisma } = make();
      await svc.setBlocked(consumer, 'cv1', true);
      expect(Object.keys(prisma.conversation.update.mock.calls[0][0].data)).toEqual(['consumerBlockedAt']);
      expect(prisma.conversation.update.mock.calls[0][0].data.consumerBlockedAt).toBeInstanceOf(Date);
      await svc.setBlocked(owner, 'cv1', false);
      expect(prisma.conversation.update.mock.calls[1][0].data).toEqual({ businessBlockedAt: null });
    });

    it('refuses sending text and images in a blocked conversation, from both sides', async () => {
      const { svc, prisma, media } = make({ ...baseConversation, businessBlockedAt: new Date() });
      await expect(svc.send(consumer, 'cv1', 'hello')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.send(owner, 'cv1', 'hello')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.sendImage(consumer, 'cv1', { buffer: Buffer.from([1]), size: 1 })).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
      expect(media.uploadImage).not.toHaveBeenCalled();
    });

    it('reports the blocked state to the thread', async () => {
      const { svc } = make({ ...baseConversation, consumerBlockedAt: new Date() });
      const forConsumer = await svc.messages(consumer, 'cv1');
      const forOwner = await svc.messages(owner, 'cv1');
      expect(forConsumer.conversation).toMatchObject({ blocked: true, blockedByMe: true });
      expect(forOwner.conversation).toMatchObject({ blocked: true, blockedByMe: false });
    });
  });

  describe('attachments', () => {
    it('uploads with the 10 MB chat limit under a conversation folder and links the asset', async () => {
      const { svc, prisma, media } = make();
      const out = await svc.sendImage(consumer, 'cv1', { buffer: Buffer.from([1]), size: 1 }, ' look ');
      expect(media.uploadImage.mock.calls[0][2]).toEqual({ maxBytes: 10 * 1024 * 1024, folder: 'localspotter/chat/cv1' });
      expect(prisma.chatMessage.create.mock.calls[0][0].data).toEqual({
        conversationId: 'cv1',
        senderUserId: 'u1',
        body: 'look',
        attachmentAssetId: 'asset1',
        fromBusiness: false,
      });
      expect(out.attachmentUrl).toBe('https://img/new.jpg');
    });

    it('propagates upload validation errors without creating a message', async () => {
      const { svc, prisma, media } = make();
      media.uploadImage.mockRejectedValue(new BadRequestException('Dit bestand is geen ondersteunde afbeelding'));
      await expect(svc.sendImage(consumer, 'cv1', { buffer: Buffer.from('x'), size: 1 })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    });
  });

  describe('notifications', () => {
    it('notifies the shop owner (in-app + email) once per unread burst', async () => {
      const { svc, prisma, notifications } = make();
      await svc.send(consumer, 'cv1', 'hi');
      expect(prisma.conversation.updateMany.mock.calls[0][0].where).toEqual({ id: 'cv1', businessNotifiedAt: null });
      expect(notifications.notifyUser).toHaveBeenCalledWith(
        'u3',
        NotificationType.CHAT,
        expect.stringContaining('Sophie'),
        'hi',
        { linkUrl: '/chat/cv1', email: true },
      );
    });

    it('does not notify again while the recipient has not read', async () => {
      const { svc, prisma, notifications } = make();
      prisma.conversation.updateMany.mockResolvedValue({ count: 0 });
      await svc.send(consumer, 'cv1', 'again');
      expect(notifications.notifyUser).not.toHaveBeenCalled();
    });

    it('notifies the consumer when the shop answers, and never fails the send if notifying breaks', async () => {
      const { svc, prisma, notifications } = make();
      prisma.$transaction.mockResolvedValue([{ id: 'm9', body: 'yo', createdAt: new Date(), readAt: null, senderUserId: 'u3', fromBusiness: true }, {}]);
      notifications.notifyUser.mockRejectedValue(new Error('smtp down'));
      await expect(svc.send(owner, 'cv1', 'yo')).resolves.toBeDefined();
      expect(notifications.notifyUser.mock.calls[0][0]).toBe('u1');
    });
  });

  describe('reports', () => {
    it('snapshots the reported message and attributes it to its sender', async () => {
      const { svc, prisma } = make();
      prisma.chatMessage.findFirst.mockResolvedValue({ id: 'm2', body: 'buy now!!', senderUserId: 'u3', fromBusiness: true, attachmentAssetId: null });
      const out = await svc.report(consumer, 'cv1', { messageId: 'm2', reason: ChatReportReason.SPAM, details: ' spam ' });
      expect(out).toEqual({ id: 'r1', alreadyReported: false });
      expect(prisma.chatReport.create.mock.calls[0][0].data).toMatchObject({
        conversationId: 'cv1',
        messageId: 'm2',
        reporterUserId: 'u1',
        reportedUserId: 'u3',
        messageSnapshot: 'buy now!!',
        details: 'spam',
      });
    });

    it('is idempotent per reporter and message', async () => {
      const { svc, prisma } = make();
      prisma.chatMessage.findFirst.mockResolvedValue({ id: 'm2', body: 'x', senderUserId: 'u3', fromBusiness: true, attachmentAssetId: null });
      prisma.chatReport.findFirst.mockResolvedValue({ id: 'r-old' });
      expect(await svc.report(consumer, 'cv1', { messageId: 'm2', reason: ChatReportReason.OTHER })).toEqual({ id: 'r-old', alreadyReported: true });
      expect(prisma.chatReport.create).not.toHaveBeenCalled();
    });

    it('rejects reporting your own message or a message from another conversation', async () => {
      const { svc, prisma } = make();
      prisma.chatMessage.findFirst.mockResolvedValue({ id: 'm1', body: 'mine', senderUserId: 'u1', fromBusiness: false, attachmentAssetId: null });
      await expect(svc.report(consumer, 'cv1', { messageId: 'm1', reason: ChatReportReason.OTHER })).rejects.toBeInstanceOf(BadRequestException);
      prisma.chatMessage.findFirst.mockResolvedValue(null);
      await expect(svc.report(consumer, 'cv1', { messageId: 'foreign', reason: ChatReportReason.OTHER })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.chatMessage.findFirst.mock.calls[1][0].where).toEqual({ id: 'foreign', conversationId: 'cv1' });
    });

    it('lets a participant report the other party without a message', async () => {
      const { svc, prisma } = make();
      await svc.report(owner, 'cv1', { reason: ChatReportReason.HARASSMENT });
      expect(prisma.chatReport.create.mock.calls[0][0].data).toMatchObject({ messageId: null, reportedUserId: 'u1', messageSnapshot: null });
    });
  });

  describe('moderation', () => {
    it('resolves an open report and writes an audit log; refuses a second resolution', async () => {
      const { svc, prisma } = make();
      prisma.chatReport.findUnique.mockResolvedValue({ id: 'r1', status: ChatReportStatus.OPEN, reason: 'SPAM' });
      await svc.resolveReport('a1', 'r1', 'RESOLVED', ' warned ');
      expect(prisma.chatReport.update.mock.calls[0][0].data).toMatchObject({ status: 'RESOLVED', resolutionNote: 'warned', resolvedByUserId: 'a1' });
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorUserId: 'a1', action: 'CHAT_REPORT_RESOLVED', targetId: 'r1' });

      prisma.chatReport.findUnique.mockResolvedValue({ id: 'r1', status: ChatReportStatus.RESOLVED });
      await expect(svc.resolveReport('a1', 'r1', 'DISMISSED')).rejects.toBeInstanceOf(BadRequestException);
      prisma.chatReport.findUnique.mockResolvedValue(null);
      await expect(svc.resolveReport('a1', 'nope', 'DISMISSED')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists open reports by default', async () => {
      const { svc, prisma } = make();
      await svc.listReports();
      expect(prisma.chatReport.findMany.mock.calls[0][0].where).toEqual({ status: 'OPEN' });
    });
  });

  describe('shop employees', () => {
    const staff = { id: 'u9', role: UserRole.CONSUMER, profileId: 'c9' } as any;

    it('treats an active employee as the shop side: can read, reply as the shop, and is not the consumer', async () => {
      const { svc, prisma, employees } = make();
      employees.isActiveStaff.mockResolvedValue(true);
      const thread = await svc.messages(staff, 'cv1');
      expect(employees.isActiveStaff).toHaveBeenCalledWith('u9', undefined);
      expect(thread.messages.find((m) => m.id === 'm2')!.mine).toBe(true); // shop message
      expect(thread.messages.find((m) => m.id === 'm1')!.mine).toBe(false); // consumer message
      await svc.send(staff, 'cv1', 'we are open');
      expect(prisma.chatMessage.create.mock.calls[0][0].data.fromBusiness).toBe(true);
    });

    it('answers 404 to a non-employee with a consumer account', async () => {
      const { svc } = make();
      await expect(svc.messages(staff, 'cv1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the shop inbox only for people who can access that shop', async () => {
      const { svc, prisma, employees } = make();
      await expect(svc.list(staff, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
      employees.canAccessShop.mockResolvedValue(true);
      await svc.list(staff, 'b1');
      expect(prisma.conversation.findMany.mock.calls[0][0].where).toEqual({ businessId: 'b1' });
    });
  });

  describe('retention', () => {
    it('removes messages older than 12 months except those with an open report', async () => {
      const { svc, prisma } = make();
      const now = new Date('2026-10-19T00:00:00Z');
      const out = await svc.purgeExpired(now);
      const where = prisma.chatMessage.deleteMany.mock.calls[0][0].where;
      expect(where.createdAt.lt.toISOString().slice(0, 10)).toBe('2025-10-19');
      expect(where.reports).toEqual({ none: { status: 'OPEN' } });
      expect(out).toMatchObject({ messagesDeleted: 5, conversationsDeleted: 2 });
      expect(prisma.conversation.deleteMany.mock.calls[0][0].where.messages).toEqual({ none: {} });
    });
  });
});
