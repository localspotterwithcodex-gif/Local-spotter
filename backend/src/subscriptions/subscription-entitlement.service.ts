import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlanSlug, SubscriptionStatus } from '@prisma/client';

export type FeatureKey = 'PRODUCTS' | 'SHOPROUTES' | 'WORKSHOPS';

@Injectable()
export class SubscriptionEntitlementService {
  constructor(private prisma: PrismaService) {}

  async hasActiveSubscription(businessId: string): Promise<boolean> {
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!sub) return false;
    if (sub.status !== SubscriptionStatus.ACTIVE && sub.status !== SubscriptionStatus.TRIALING) {
      return false;
    }
    return sub.currentPeriodEnd.getTime() > Date.now();
  }

  async hasFeature(businessId: string, feature: FeatureKey): Promise<boolean> {
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });

    if (!sub || (sub.status !== SubscriptionStatus.ACTIVE && sub.status !== SubscriptionStatus.TRIALING)) {
      return false;
    }

    if (sub.currentPeriodEnd.getTime() <= Date.now()) {
      return false;
    }

    const planSlug = sub.plan.slug;

    switch (feature) {
      case 'PRODUCTS':
        // All plans (WEBSHOP, SHOPROUTES, WORKSHOP) include products
        return true;

      case 'SHOPROUTES':
        // SHOPROUTES and WORKSHOP plans include shoproutes
        return planSlug === SubscriptionPlanSlug.SHOPROUTES || planSlug === SubscriptionPlanSlug.WORKSHOP;

      case 'WORKSHOPS':
        // Only WORKSHOP plan includes workshops & community features
        return planSlug === SubscriptionPlanSlug.WORKSHOP;

      default:
        return false;
    }
  }
}
