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
