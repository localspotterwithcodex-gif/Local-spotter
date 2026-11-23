"use client";

import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

export type OwnerFeature = "products" | "shoproutes" | "workshops";

/** Feature access of the owner's shop, as the API reports it (the API also enforces it). */
export function useOwnerAccess(businessId: string | null) {
  const res = useApiResource(businessId && `owner-entitlements:${businessId}`, () => api.getBusinessEntitlements(businessId!));
  return {
    loading: Boolean(businessId) && res.loading,
    error: res.error,
    entitlements: res.data ?? null,
    can: (feature: OwnerFeature) => Boolean(res.data?.features[feature.toUpperCase() as Uppercase<OwnerFeature>]),
  };
}
