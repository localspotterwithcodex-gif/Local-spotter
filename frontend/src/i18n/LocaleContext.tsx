"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { dictionaries, Locale, TranslationKey } from "./dictionaries";

const COOKIE_KEY = "localspotter_locale";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function readCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
  const value = match?.[1];
  return value === "en" || value === "nl" ? value : null;
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie) {
      setLocaleState(fromCookie);
      return;
    }
    const browserLang = typeof navigator !== "undefined" ? navigator.language : "en";
    setLocaleState(browserLang.toLowerCase().startsWith("nl") ? "nl" : "en");
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
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
