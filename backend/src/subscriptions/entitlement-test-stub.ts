import { ForbiddenException } from '@nestjs/common';

/**
 * For unit tests: adds assertFeature / assertWithinLimit to a fake entitlement service, decided by the fake's own
 * `hasFeature` mock and the given limits, with the same 403 shape as SubscriptionEntitlementService.
 */
export function withEntitlementAsserts<T extends { hasFeature: (...args: any[]) => any }>(
  stub: T,
  limits: Record<string, number> = { maxProductImages: 3, maxReviewPhotos: 0, maxReviewVideos: 0 },
) {
  return Object.assign(stub, {
    assertFeature: async (businessId: string, feature: string, message: string) => {
      if (!(await stub.hasFeature(businessId, feature))) throw new ForbiddenException({ code: 'PLAN_FEATURE_REQUIRED', feature, message });
    },
    assertWithinLimit: async (_businessId: string, limit: string, wanted: number, message: string) => {
      if (wanted > (limits[limit] ?? 0)) throw new ForbiddenException({ code: 'PLAN_FEATURE_REQUIRED', limit, allowed: limits[limit], message });
    },
  });
}
