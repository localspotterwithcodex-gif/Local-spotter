import { ApiError } from "@/lib/api/client";
import type { TranslationKey } from "@/i18n/dictionaries";

export type ErrorKind = "network" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "validation" | "rateLimited" | "unavailable" | "server" | "unknown";

const KIND_KEY: Record<ErrorKind, TranslationKey> = {
  network: "error.network",
  unauthorized: "error.unauthorized",
  forbidden: "error.forbidden",
  notFound: "error.notFound",
  conflict: "error.conflict",
  validation: "error.validation",
  rateLimited: "error.rateLimited",
  unavailable: "error.unavailable",
  server: "error.server",
  unknown: "error.unknown",
};

/** Machine-readable `code` the backend attaches to some 403s (see ForbiddenException payloads). */
export function errorCode(err: unknown): string | undefined {
  if (!(err instanceof ApiError)) return undefined;
  const b = err.body as { code?: unknown } | null;
  return b && typeof b.code === "string" ? b.code : undefined;
}

const CODE_KEY: Record<string, TranslationKey> = {
  ORIGIN_BLOCKED: "error.originBlocked",
  NO_SUBSCRIPTION: "error.noSubscription",
  NOT_SHOP_OWNER: "error.notShopOwner",
  PAYMENTS_UNAVAILABLE: "error.paymentsUnavailable",
  PAYMENT_PROVIDER_ERROR: "error.paymentProviderError",
  IBAN_INVALID: "error.ibanInvalid",
  BANK_DETAILS_REQUIRED: "error.bankDetailsRequired",
  BANK_DETAILS_INVALID: "error.bankDetailsInvalid",
};

/** Classifies a thrown value by HTTP status so the UI can show it in the active language. */
export function errorKind(err: unknown): ErrorKind {
  if (!(err instanceof ApiError)) return "unknown";
  const s = err.status;
  if (s === 0) return "network";
  if (s === 401) return "unauthorized";
  if (s === 403) return "forbidden";
  if (s === 404) return "notFound";
  if (s === 409) return "conflict";
  if (s === 400 || s === 422) return "validation";
  if (s === 429) return "rateLimited";
  if (s === 503) return "unavailable";
  if (s >= 500) return "server";
  return "unknown";
}

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Translated, user-safe message for any thrown value. Server-supplied message
 * text is never shown (the API is not localised); pass `overrides` to give a
 * specific kind a screen-specific key, e.g. `{ unauthorized: "auth.invalidCredentials" }`.
 */
export function describeError(err: unknown, t: Translate, overrides?: Partial<Record<ErrorKind, TranslationKey>>): string {
  const kind = errorKind(err);
  const code = errorCode(err);
  if (code && CODE_KEY[code]) return t(CODE_KEY[code]);
  return t(overrides?.[kind] ?? KIND_KEY[kind]);
}

export { validationDetail } from "./validation-detail";
