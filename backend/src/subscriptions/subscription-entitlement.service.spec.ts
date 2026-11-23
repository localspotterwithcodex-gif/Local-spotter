import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlanSlug, SubscriptionStatus, UserRole } from '@prisma/client';
import { SubscriptionEntitlementService, FeatureKey } from './subscription-entitlement.service';
import { SubscriptionsService } from './subscriptions.service';
import { PLAN_ENTITLEMENT_DEFAULTS } from './plan-entitlement-defaults';

const PRICES: Record<SubscriptionPlanSlug, number> = { WEBSHOP: 12, SHOPROUTES: 27, WORKSHOP: 57 };
const plans = (Object.keys(PLAN_ENTITLEMENT_DEFAULTS) as SubscriptionPlanSlug[]).map((slug) => ({
  slug,
  active: true,
  monthlyPrice: PRICES[slug],
  ...PLAN_ENTITLEMENT_DEFAULTS[slug],
}));

/** Fake prisma: one shop subscribed to `slug` (or none); subscriptionPlan.findFirst picks the cheapest match. */
function make(slug: SubscriptionPlanSlug | null, status: SubscriptionStatus = SubscriptionStatus.ACTIVE, endsInMs = 86_400_000) {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(async () =>
        slug ? { status, currentPeriodEnd: new Date(Date.now() + endsInMs), plan: plans.find((p) => p.slug === slug) } : null,
      ),
    },
    subscriptionPlan: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const ok = (p: (typeof plans)[number]) =>
          Object.entries(where).every(([k, v]) => {
            const have = (p as Record<string, unknown>)[k];
            return typeof v === 'object' && v && 'gte' in v ? (have as number) >= (v as { gte: number }).gte : have === v;
          });
        const hit = plans.filter(ok).sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0];
        return hit ? { slug: hit.slug } : null;
      }),
    },
  };
  return new SubscriptionEntitlementService(prisma as never);
}

// Expected access per plan (MASTER-PROMPT 3.5, D11): reviews, review media, customer photos and workshops are Workshop-only.
const EXPECTED: Record<SubscriptionPlanSlug, Record<FeatureKey, boolean>> = {
  WEBSHOP: { PRODUCTS: true, SHOPROUTES: false, WORKSHOPS: false, REVIEWS: false, SHOP_VIDEO: false, CUSTOMER_PHOTOS: false },
  SHOPROUTES: { PRODUCTS: true, SHOPROUTES: true, WORKSHOPS: false, REVIEWS: false, SHOP_VIDEO: true, CUSTOMER_PHOTOS: false },
  WORKSHOP: { PRODUCTS: true, SHOPROUTES: true, WORKSHOPS: true, REVIEWS: true, SHOP_VIDEO: true, CUSTOMER_PHOTOS: true },
};

describe('SubscriptionEntitlementService', () => {
  for (const slug of Object.keys(EXPECTED) as SubscriptionPlanSlug[]) {
    for (const [feature, allowed] of Object.entries(EXPECTED[slug]) as [FeatureKey, boolean][]) {
      it(`${slug} ${allowed ? 'allows' : 'denies'} ${feature}`, async () => {
        const svc = make(slug);
        expect(await svc.hasFeature('b1', feature)).toBe(allowed);
        const check = svc.assertFeature('b1', feature, 'msg');
        if (allowed) await expect(check).resolves.toBeUndefined();
        else
          await expect(check).rejects.toMatchObject({
            status: 403,
            response: { code: 'PLAN_FEATURE_REQUIRED', currentPlan: slug, feature, message: 'msg' },
          });
      });
    }
  }

  it('names the cheapest plan that has the missing feature', async () => {
    await expect(make('WEBSHOP').assertFeature('b1', 'SHOPROUTES', 'm')).rejects.toMatchObject({ response: { requiredPlan: 'SHOPROUTES' } });
    await expect(make('SHOPROUTES').assertFeature('b1', 'REVIEWS', 'm')).rejects.toMatchObject({ response: { requiredPlan: 'WORKSHOP' } });
  });

  it('denies everything with NO_SUBSCRIPTION when there is no subscription, it lapsed or was cancelled', async () => {
    for (const svc of [make(null), make('WORKSHOP', SubscriptionStatus.ACTIVE, -1000), make('WORKSHOP', SubscriptionStatus.CANCELLED)]) {
      const e = await svc.getEntitlements('b1');
      expect(e).toMatchObject({ active: false, plan: null, limits: { maxProductImages: 0, maxReviewPhotos: 0, maxReviewVideos: 0 } });
      expect(Object.values(e.features).every((v) => v === false)).toBe(true);
      await expect(svc.assertFeature('b1', 'PRODUCTS', 'm')).rejects.toMatchObject({ response: { code: 'NO_SUBSCRIPTION', requiredPlan: 'WEBSHOP' } });
    }
  });

  it('counts a trial as active', async () => {
    expect(await make('WEBSHOP', SubscriptionStatus.TRIALING).hasFeature('b1', 'PRODUCTS')).toBe(true);
  });

  it('enforces limits: 3 product images on every plan, review media only on Workshop', async () => {
    const shop = make('WEBSHOP');
    await expect(shop.assertWithinLimit('b1', 'maxProductImages', 3, 'm')).resolves.toBeUndefined();
    await expect(shop.assertWithinLimit('b1', 'maxProductImages', 4, 'm')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(shop.assertWithinLimit('b1', 'maxReviewPhotos', 1, 'm')).rejects.toMatchObject({
      response: { code: 'PLAN_FEATURE_REQUIRED', limit: 'maxReviewPhotos', allowed: 0, requiredPlan: 'WORKSHOP' },
    });
    const workshop = make('WORKSHOP');
    await expect(workshop.assertWithinLimit('b1', 'maxReviewPhotos', 8, 'm')).resolves.toBeUndefined();
    await expect(workshop.assertWithinLimit('b1', 'maxReviewVideos', 3, 'm')).rejects.toMatchObject({ response: { allowed: 2, requiredPlan: null } });
  });
});

describe('GET /businesses/:id/entitlements (SubscriptionsService.getEntitlements)', () => {
  const prisma = {
    business: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({ b1: { id: 'b1', ownerProfileId: 'op-A', deletedAt: null } } as Record<string, unknown>)[where.id] ?? null) },
    businessOwnerProfile: { findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => ({ A: { id: 'op-A' }, B: { id: 'op-B' } } as Record<string, unknown>)[where.userId] ?? null) },
  };
  const entitlements = { getEntitlements: jest.fn(async () => ({ active: true, plan: 'WEBSHOP' })) };
  const service = new SubscriptionsService(prisma as never, {} as never, entitlements as never);

  it('returns the entitlements to the shop owner and to an admin', async () => {
    await expect(service.getEntitlements('b1', { id: 'A', role: UserRole.BUSINESS_OWNER })).resolves.toMatchObject({ plan: 'WEBSHOP' });
    await expect(service.getEntitlements('b1', { id: 'admin', role: UserRole.SUPER_ADMIN })).resolves.toMatchObject({ plan: 'WEBSHOP' });
  });

  it("refuses another owner's shop (403) and an unknown shop (404)", async () => {
    await expect(service.getEntitlements('b1', { id: 'B', role: UserRole.BUSINESS_OWNER })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getEntitlements('nope', { id: 'A', role: UserRole.BUSINESS_OWNER })).rejects.toBeInstanceOf(NotFoundException);
  });
});
