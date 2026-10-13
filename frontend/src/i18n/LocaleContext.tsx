"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { dictionaries, Locale, TranslationKey } from "./dictionaries";

export const LOCALE_COOKIE_KEY = "localspotter_locale";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

/**
 * The initial locale is resolved on the SERVER (cookie, then Accept-Language)
 * in the root layout and passed in, so server and client render the same
 * language on first paint — no effect-driven state change, no hydration
 * mismatch, and the same value is used across the consumer, owner and admin
 * portals because they all sit under this one provider.
 */
export const LocaleProvider: React.FC<{ initialLocale: Locale; children: React.ReactNode }> = ({
  initialLocale,
  children,
}) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
};
