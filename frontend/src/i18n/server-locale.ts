import { cookies } from "next/headers";
import type { Locale } from "./dictionaries";

const COOKIE_KEY = "localspotter_locale";

/**
 * Resolves the locale for the current request: the visitor's explicit choice (cookie) first,
 * otherwise Dutch (decision D-008: Dutch default, English via the language switch).
 */
export async function getInitialLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(COOKIE_KEY)?.value;
  if (fromCookie === "en" || fromCookie === "nl") return fromCookie;
  return "nl";
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
