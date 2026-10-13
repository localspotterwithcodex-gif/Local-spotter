"use client";

import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { Business } from "@/types/business";

/**
 * The signed-in owner's business (first one; multi-business owners are not
 * supported by the UI yet). Replaces the hardcoded "bus-1" id.
 */
export function useMyBusiness() {
  const res = useApiResource<Business[]>("my-businesses", () => api.getMyBusinesses());
  return {
    business: res.data?.[0] ?? null,
    businesses: res.data ?? [],
    loading: res.loading,
    error: res.error,
    reload: res.reload,
  };
}
