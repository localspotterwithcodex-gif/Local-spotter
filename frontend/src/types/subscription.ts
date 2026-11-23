export type PlanSlug = "webshop" | "shoproutes" | "workshop";

export interface SubscriptionPlan {
  id: string;
  slug: PlanSlug;
  name: string;
  monthlyPrice: number; // EUR 50, 100, 150
  currency: string;
  description: string;
  features: string[];
  hasShoproutes: boolean;
  hasWorkshops: boolean;
  hasReviews: boolean;
  hasFollowers: boolean;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planSlug: PlanSlug;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "INACTIVE";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
}

/** GET /businesses/:id/entitlements — mirrors the backend's SubscriptionEntitlementService. */
export type EntitlementFeature = "PRODUCTS" | "SHOPROUTES" | "WORKSHOPS" | "REVIEWS" | "SHOP_VIDEO" | "CUSTOMER_PHOTOS";
export interface BusinessEntitlements {
  active: boolean;
  plan: "WEBSHOP" | "SHOPROUTES" | "WORKSHOP" | null;
  features: Record<EntitlementFeature, boolean>;
  limits: { maxProductImages: number; maxReviewPhotos: number; maxReviewVideos: number };
}
