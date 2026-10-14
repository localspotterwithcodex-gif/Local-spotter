import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Intl locale per app language. Prefer the `useFormat()` hook in components. */
const INTL: Record<"en" | "nl", string> = { en: "en-GB", nl: "nl-NL" };

export function formatCurrency(amount: number, locale: "en" | "nl" = "nl"): string {
  return new Intl.NumberFormat(INTL[locale], {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(dateString: string, locale: "en" | "nl" = "nl"): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(INTL[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(dateString: string, locale: "en" | "nl" = "nl"): { month: string; day: string } {
  const date = new Date(dateString);
  const month = date.toLocaleString(INTL[locale], { month: "short" }).toUpperCase();
  const day = date.getDate().toString();
  return { month, day };
}
