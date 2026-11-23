import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubscriptionPlanSlug, SubscriptionStatus } from '@prisma/client';

export type FeatureKey = 'PRODUCTS' | 'SHOPROUTES' | 'WORKSHOPS' | 'REVIEWS' | 'SHOP_VIDEO' | 'CUSTOMER_PHOTOS';
export type LimitKey = 'maxProductImages' | 'maxReviewPhotos' | 'maxReviewVideos';

/** subscription_plans column behind each feature; PRODUCTS comes with every active plan. */
const FEATURE_COLUMN: Record<Exclude<FeatureKey, 'PRODUCTS'>, keyof Prisma.SubscriptionPlanWhereInput> = {
  SHOPROUTES: 'shoproutesEnabled',
  WORKSHOPS: 'workshopsEnabled', // workshops, followers and community
  REVIEWS: 'reviewsEnabled', // free-standing reviews; reviews of a delivered order are allowed on every plan
  SHOP_VIDEO: 'shopVideoEnabled',
  CUSTOMER_PHOTOS: 'showCustomerPhotos',
};
const LIMIT_KEYS: LimitKey[] = ['maxProductImages', 'maxReviewPhotos', 'maxReviewVideos'];

export interface Entitlements {
  active: boolean;
  plan: SubscriptionPlanSlug | null;
  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, number>;
}

/** The single place that decides what a shop's plan allows (MASTER-PROMPT Phase 5). */
@Injectable()
export class SubscriptionEntitlementService {
  constructor(private prisma: PrismaService) {}

  async getEntitlements(businessId: string): Promise<Entitlements> {
    const sub = await this.prisma.businessSubscription.findUnique({ where: { businessId }, include: { plan: true } });
    const active =
      !!sub &&
      (sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIALING) &&
      sub.currentPeriodEnd.getTime() > Date.now();
    const plan = active ? sub.plan : null;
    const features = { PRODUCTS: active } as Record<FeatureKey, boolean>;
    for (const [f, col] of Object.entries(FEATURE_COLUMN)) features[f as FeatureKey] = !!plan?.[col as keyof typeof plan];
    const limits = Object.fromEntries(LIMIT_KEYS.map((k) => [k, plan ? plan[k] : 0])) as Record<LimitKey, number>;
    return { active, plan: plan?.slug ?? null, features, limits };
  }

  async hasActiveSubscription(businessId: string): Promise<boolean> {
    return (await this.getEntitlements(businessId)).active;
  }

  async hasFeature(businessId: string, feature: FeatureKey): Promise<boolean> {
    return (await this.getEntitlements(businessId)).features[feature];
  }

  /** 403 NO_SUBSCRIPTION (no active plan) or PLAN_FEATURE_REQUIRED (plan lacks it), naming the cheapest plan that has it. */
  async assertFeature(businessId: string, feature: FeatureKey, message: string): Promise<void> {
    const e = await this.getEntitlements(businessId);
    if (e.features[feature]) return;
    const where: Prisma.SubscriptionPlanWhereInput = feature === 'PRODUCTS' ? {} : { [FEATURE_COLUMN[feature]]: true };
    throw await this.denied(e, where, { feature, message });
  }

  /** Throws when `wanted` items exceed the plan's limit (e.g. product images after this upload). */
  async assertWithinLimit(businessId: string, limit: LimitKey, wanted: number, message: string): Promise<void> {
    const e = await this.getEntitlements(businessId);
    if (wanted <= e.limits[limit]) return;
    throw await this.denied(e, { [limit]: { gte: wanted } }, { limit, allowed: e.limits[limit], message });
  }

  private async denied(e: Entitlements, planWhere: Prisma.SubscriptionPlanWhereInput, details: Record<string, unknown>) {
    const required = await this.prisma.subscriptionPlan.findFirst({
      where: { active: true, ...planWhere },
      orderBy: { monthlyPrice: 'asc' },
      select: { slug: true },
    });
    return new ForbiddenException({
      statusCode: 403,
      code: e.active ? 'PLAN_FEATURE_REQUIRED' : 'NO_SUBSCRIPTION',
      currentPlan: e.plan,
      requiredPlan: required?.slug ?? null,
      ...details,
    });
  }
}
