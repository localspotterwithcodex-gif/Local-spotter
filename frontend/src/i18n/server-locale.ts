import { cookies, headers } from "next/headers";
import type { Locale } from "./dictionaries";

const COOKIE_KEY = "localspotter_locale";

/**
 * Resolves the locale for the current request: explicit cookie choice first,
 * otherwise the browser's Accept-Language, otherwise "en". This preserves the
 * pre-existing behaviour (the product-owner decision on the default language
 * is still open — see docs/DECISIONS-AND-CONFLICTS.md D-008).
 */
export async function getInitialLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(COOKIE_KEY)?.value;
  if (fromCookie === "en" || fromCookie === "nl") return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("nl") ? "nl" : "en";
}
