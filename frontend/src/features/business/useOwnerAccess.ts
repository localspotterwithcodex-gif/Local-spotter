"use client";

import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { planAllows, type OwnerFeature } from "@/lib/plan-access";

/** Feature access of the owner's shop according to its current subscription. */
export function useOwnerAccess(businessId: string | null) {
  const subRes = useApiResource(businessId && `owner-subscription:${businessId}`, () => api.getBusinessSubscription(businessId!));
  return {
    loading: Boolean(businessId) && subRes.loading,
    error: subRes.error,
    subscription: subRes.data ?? null,
    can: (feature: OwnerFeature) => planAllows(subRes.data, feature),
  };
}
