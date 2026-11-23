import { SubscriptionPlanSlug } from '@prisma/client';

/**
 * Entitlements a plan starts with when it is first created (MASTER-PROMPT 3.5, D3, D11; D-012: 3 product images, per the requirements). After that the admin
 * edits them in subscription_plans. Keep in sync with the backfill in migration 20261120100000.
 */
export const PLAN_ENTITLEMENT_DEFAULTS: Record<
  SubscriptionPlanSlug,
  {
    reviewsEnabled: boolean;
    maxProductImages: number;
    maxReviewPhotos: number;
    maxReviewVideos: number;
    shopVideoEnabled: boolean;
    showCustomerPhotos: boolean;
    workshopsEnabled: boolean;
    shoproutesEnabled: boolean;
  }
> = {
  WEBSHOP: { reviewsEnabled: false, maxProductImages: 3, maxReviewPhotos: 0, maxReviewVideos: 0, shopVideoEnabled: false, showCustomerPhotos: false, workshopsEnabled: false, shoproutesEnabled: false },
  SHOPROUTES: { reviewsEnabled: false, maxProductImages: 3, maxReviewPhotos: 0, maxReviewVideos: 0, shopVideoEnabled: true, showCustomerPhotos: false, workshopsEnabled: false, shoproutesEnabled: true },
  WORKSHOP: { reviewsEnabled: true, maxProductImages: 3, maxReviewPhotos: 8, maxReviewVideos: 2, shopVideoEnabled: true, showCustomerPhotos: true, workshopsEnabled: true, shoproutesEnabled: true },
};
