import { ApiError } from "./api/client.ts";

/**
 * Server-supplied validation text for 400/422 responses (the API's own wording, not localised).
 * Shown only as a detail next to the translated generic message so the user can see *which* field
 * or rule failed. Returns "" when there is nothing useful.
 */
export function validationDetail(err: unknown): string {
  if (!(err instanceof ApiError) || (err.status !== 400 && err.status !== 422)) return "";
  const b = err.body as { message?: unknown } | null;
  const m = b?.message;
  const list = Array.isArray(m) ? m : typeof m === "string" ? [m] : [];
  return list.filter((x): x is string => typeof x === "string").slice(0, 3).join(" · ");
}
