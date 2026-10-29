"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Records one view of a public shop, shop route or workshop page and returns the current view count
 * (null until known). The backend counts a visitor once per 30 minutes and ignores the owner's own visits,
 * and always answers with the current total, so calling this on every page load is safe.
 */
export function usePageView(kind: "shop" | "route" | "workshop", id: string | null | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .recordView(kind, id)
      .then((r) => !cancelled && setCount(r.viewCount))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind, id]);
  return count;
}
