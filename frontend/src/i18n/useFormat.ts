"use client";

import { useMemo } from "react";
import { useLocale } from "./LocaleContext";

const INTL_LOCALE = { en: "en-GB", nl: "nl-NL" } as const;

/**
 * Locale-aware formatting bound to the active language. Use this hook instead
 * of the module-level helpers in lib/utils.ts so numbers, prices and dates
 * switch language together with the text.
 */
export function useFormat() {
  const { locale } = useLocale();
  return useMemo(() => {
    const intl = INTL_LOCALE[locale];
    const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));
    return {
      locale,
      currency: (amount: number, currency = "EUR") => new Intl.NumberFormat(intl, { style: "currency", currency }).format(amount),
      number: (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(intl, opts).format(n),
      date: (v: string | number | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
        new Intl.DateTimeFormat(intl, opts).format(toDate(v)),
      dateTime: (v: string | number | Date) =>
        new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(toDate(v)),
      time: (v: string | number | Date) => new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(toDate(v)),
      monthShort: (v: string | number | Date) => new Intl.DateTimeFormat(intl, { month: "short" }).format(toDate(v)).toUpperCase(),
    };
  }, [locale]);
}
