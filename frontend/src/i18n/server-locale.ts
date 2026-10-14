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

import { dictionaries } from "./dictionaries";
import type { TranslationKey } from "./dictionaries";
import { interpolate } from "./define";

/** Translator for server components / metadata (same resolution as the client provider). */
export async function getServerT() {
  const locale = await getInitialLocale();
  return {
    locale,
    t: (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(dictionaries[locale][key] ?? dictionaries.en[key] ?? key, params),
  };
}
