"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { describeError } from "@/lib/errors";

export interface ApiResource<T> {
  data: T | undefined;
  error: string | undefined;
  /** true until the first response (or error) for the current request key arrives */
  loading: boolean;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data?: T;
  err?: unknown;
  failed?: boolean;
}

/**
 * Loads data from the API and exposes explicit loading / error states.
 * `key` identifies the request; pass `null` to skip (e.g. while waiting for an id).
 * Never falls back to mock data: a failed request surfaces as `error`.
 */
export function useApiResource<T>(key: string | null, fetcher: () => Promise<T>): ApiResource<T> {
  const { t, locale } = useLocale();
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  // locale is part of the key: switching language refetches user-entered content in that language
  const requestKey = key === null ? null : `${key}@${locale}#${nonce}`;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setSettled({ key: requestKey, data });
      },
      (err: unknown) => {
        if (!cancelled) setSettled({ key: requestKey, err, failed: true });
      }
    );
    return () => {
      cancelled = true;
    };
    // fetcher intentionally excluded: the caller's `key` describes its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = settled && settled.key === requestKey ? settled : null;

  return {
    data: current?.data,
    // translated at render time so the message follows the language toggle
    error: current?.failed ? describeError(current.err, t) : undefined,
    loading: requestKey !== null && current === null,
    reload,
  };
}
