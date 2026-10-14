"use client";

import { useCallback } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { describeError, type ErrorKind } from "@/lib/errors";
import type { TranslationKey } from "@/i18n/dictionaries";

/** `const msg = useErrorMessage(); setError(msg(err, { unauthorized: "auth.invalidCredentials" }))` */
export function useErrorMessage() {
  const { t } = useLocale();
  return useCallback((err: unknown, overrides?: Partial<Record<ErrorKind, TranslationKey>>) => describeError(err, t, overrides), [t]);
}
