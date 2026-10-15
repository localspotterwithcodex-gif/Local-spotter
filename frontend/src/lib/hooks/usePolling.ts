"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { describeError } from "@/lib/errors";

/**
 * Loads data and refreshes it every `intervalMs` while the tab is visible.
 * Unlike useApiResource, previous data stays on screen during a refresh (no
 * flicker); an error only replaces the screen when there is nothing to show yet.
 */
export function usePolling<T>(key: string | null, fetcher: () => Promise<T>, intervalMs = 5000) {
  const { t } = useLocale();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(key !== null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    try {
      const next = await fetcherRef.current();
      setData(next);
      setError(undefined);
    } catch (err) {
      setError(describeError(err, tRef.current));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key === null) return;
    setData(undefined);
    setLoading(true);
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [key, intervalMs, load]);

  return { data, error, loading, reload: load, setData };
}
