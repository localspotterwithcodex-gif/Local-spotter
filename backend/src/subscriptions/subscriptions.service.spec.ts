import { SubscriptionStatus, UserRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';

const owner = { id: 'owner-1', role: UserRole.BUSINESS_OWNER };

function make(opts: { configured: boolean; existing?: Record<string, unknown> | null; price?: number }) {
  const prisma = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', ownerProfileId: 'op-1', deletedAt: null }) },
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'op-1' }) },
    subscriptionPlan: { findUnique: jest.fn().mockResolvedValue({ id: 'plan-2', slug: 'WEBSHOP', active: true, monthlyPrice: opts.price ?? 9.99 }) },
    businessSubscription: {
      findUnique: jest.fn().mockResolvedValue(opts.existing ?? null),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
  };
  const gateway = { isConfigured: () => opts.configured };
  return { service: new SubscriptionsService(prisma as never, gateway as never), prisma };
}

describe('SubscriptionsService.selectPlan', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  it('keeps the plan INCOMPLETE until paid when a payment provider is configured', async () => {
    process.env.NODE_ENV = 'development';
    const { service, prisma } = make({ configured: true });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.create.mock.calls[0][0].data).toMatchObject({ status: SubscriptionStatus.INCOMPLETE, provider: 'MOLLIE' });
  });

  it('activates a free (EUR 0) plan immediately, also in production and without a provider', async () => {
    process.env.NODE_ENV = 'production';
    const { service, prisma } = make({ configured: false, price: 0 });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.create.mock.calls[0][0].data).toMatchObject({ status: SubscriptionStatus.ACTIVE, provider: 'MANUAL' });
  });

  it('never activates without payment in production, even without a provider', async () => {
    process.env.NODE_ENV = 'production';
    const { service, prisma } = make({ configured: false });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.create.mock.calls[0][0].data.status).toBe(SubscriptionStatus.INCOMPLETE);
  });

  it('activates directly only in development without a provider', async () => {
    process.env.NODE_ENV = 'development';
    const { service, prisma } = make({ configured: false });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.create.mock.calls[0][0].data).toMatchObject({ status: SubscriptionStatus.ACTIVE, provider: 'MANUAL' });
  });

  it('does nothing when the shop already has this plan paid and running', async () => {
    process.env.NODE_ENV = 'production';
    const existing = { id: 's1', planId: 'plan-2', status: SubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 86400000) };
    const { service, prisma } = make({ configured: true, existing });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.update).not.toHaveBeenCalled();
    expect(prisma.businessSubscription.create).not.toHaveBeenCalled();
  });

  it('switching to another plan requires a new payment', async () => {
    process.env.NODE_ENV = 'production';
    const existing = { id: 's1', planId: 'plan-1', status: SubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 86400000) };
    const { service, prisma } = make({ configured: true, existing });
    await service.selectPlan('b1', owner, { planSlug: 'WEBSHOP' } as never);
    expect(prisma.businessSubscription.update.mock.calls[0][0].data).toMatchObject({ planId: 'plan-2', status: SubscriptionStatus.INCOMPLETE });
  });
});
