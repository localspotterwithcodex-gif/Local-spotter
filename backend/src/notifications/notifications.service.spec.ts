import { NotificationsService } from './notifications.service';

describe('NotificationsService preferences & owner notifications', () => {
  const prisma: any = {
    business: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
    notificationPreference: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new NotificationsService(prisma);
    prisma.business.findUnique.mockResolvedValue({ ownerProfile: { userId: 'owner-1' } });
  });

  it('defaults every preference to on when nothing is stored', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    await expect(service.getPreferences('owner-1')).resolves.toEqual({ notifyOrders: true, notifyReviews: true, notifyTips: true });
  });

  it('creates an ORDER notification for the owner when enabled', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    await service.notifyBusinessOwner('b1', 'ORDER', 'Nieuwe bestelling', 'msg', '/owner/orders');
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'owner-1', type: 'ORDER', read: false }) }),
    );
  });

  it('does not notify when the owner switched that kind off', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({ notifyOrders: false, notifyReviews: true, notifyTips: true });
    await service.notifyBusinessOwner('b1', 'ORDER', 't', 'm');
    expect(prisma.notification.create).not.toHaveBeenCalled();
    await service.notifyBusinessOwner('b1', 'REVIEW', 't', 'm');
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('never throws when creating the notification fails', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockRejectedValue(new Error('db down'));
    await expect(service.notifyBusinessOwner('b1', 'ORDER', 't', 'm')).resolves.toBeUndefined();
  });

  it('only updates the fields that were sent', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({ notifyOrders: false, notifyReviews: true, notifyTips: true });
    await service.updatePreferences('owner-1', { notifyOrders: false });
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: 'owner-1', notifyOrders: false }, update: { notifyOrders: false } }),
    );
  });
});


describe('NotificationsService.notifyUser', () => {
  it('creates an in-app notification and emails when requested and configured', async () => {
    const prisma: any = { notification: { create: jest.fn().mockResolvedValue({}) }, user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@b.nl' }) } };
    const mail = { isConfigured: () => true, supports: () => true, send: jest.fn().mockResolvedValue(undefined) };
    const service = new NotificationsService(prisma, mail as any);
    await service.notifyUser('u1', 'BOOKING' as any, 'T', 'M', { linkUrl: '/x', email: true });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: { userId: 'u1', type: 'BOOKING', title: 'T', message: 'M', linkUrl: '/x', read: false } });
    expect(mail.send).toHaveBeenCalledWith({ to: 'a@b.nl', channel: 'EMAIL', subject: 'T', text: 'M' });
  });

  it('skips email when no provider is configured and never throws', async () => {
    const prisma: any = { notification: { create: jest.fn().mockRejectedValue(new Error('db')) }, user: { findUnique: jest.fn() } };
    const mail = { isConfigured: () => false, supports: () => true, send: jest.fn() };
    const service = new NotificationsService(prisma, mail as any);
    await expect(service.notifyUser('u1', 'BOOKING' as any, 'T', 'M', { email: true })).resolves.toBeUndefined();
    expect(mail.send).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.notifyUser for guests', () => {
  const mailOk = () => ({ isConfigured: () => true, supports: () => true, send: jest.fn().mockResolvedValue(undefined) });

  it('mails the guest contact address and appends the personal order link', async () => {
    const prisma: any = {
      notification: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue({ email: null, guestEmail: 'gast@example.com', isGuest: true }) },
    };
    const mail = mailOk();
    const links = { orderLinkFor: jest.fn().mockResolvedValue('https://app.example/guest/orders?token=abc') };
    const service = new NotificationsService(prisma, mail as any, links as any);
    await service.notifyUser('g1', 'ORDER' as any, 'Betaling ontvangen', 'Bedankt!', { email: true });
    const sent = mail.send.mock.calls[0][0];
    expect(sent.to).toBe('gast@example.com');
    expect(sent.text).toContain('Bedankt!');
    expect(sent.text).toContain('https://app.example/guest/orders?token=abc');
    expect(links.orderLinkFor).toHaveBeenCalledWith('g1');
  });

  it('does not add a link for normal accounts and sends nothing without any address', async () => {
    const mail = mailOk();
    const links = { orderLinkFor: jest.fn() };
    const prisma: any = {
      notification: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'a@b.nl', guestEmail: null, isGuest: false }) },
    };
    await new NotificationsService(prisma, mail as any, links as any).notifyUser('u1', 'ORDER' as any, 'T', 'M', { email: true });
    expect(mail.send).toHaveBeenCalledWith({ to: 'a@b.nl', channel: 'EMAIL', subject: 'T', text: 'M' });
    expect(links.orderLinkFor).not.toHaveBeenCalled();

    const mail2 = mailOk();
    prisma.user.findUnique.mockResolvedValue({ email: null, guestEmail: null, isGuest: false });
    await new NotificationsService(prisma, mail2 as any, links as any).notifyUser('u2', 'ORDER' as any, 'T', 'M', { email: true });
    expect(mail2.send).not.toHaveBeenCalled();
  });
});
