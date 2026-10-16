import type { BusinessSubscription } from "@/types/subscription";

export type OwnerFeature = "products" | "shoproutes" | "workshops";

/**
 * Mirrors backend SubscriptionEntitlementService.hasFeature:
 * WEBSHOP → products; SHOPROUTES → + shop routes; WORKSHOP → + workshops (and shop routes).
 * The backend remains the authority; this only drives UI gating and messages.
 */
export function planAllows(
  sub: Pick<BusinessSubscription, "planSlug" | "status" | "currentPeriodEnd"> | null | undefined,
  feature: OwnerFeature,
  now: number = Date.now()
): boolean {
  if (!sub || sub.status !== "ACTIVE") return false;
  if (new Date(sub.currentPeriodEnd).getTime() <= now) return false;
  switch (feature) {
    case "products":
      return true;
    case "shoproutes":
      return sub.planSlug === "shoproutes" || sub.planSlug === "workshop";
    case "workshops":
      return sub.planSlug === "workshop";
  }
}
