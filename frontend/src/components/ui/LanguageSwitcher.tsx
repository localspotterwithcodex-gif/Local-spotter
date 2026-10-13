"use client";

import React from "react";
import { useLocale } from "@/i18n/LocaleContext";

/**
 * Present on every portal's header (public, consumer, business owner,
 * super admin) per PROMPT.md item 1 / item 12. Persists the choice in a
 * cookie so it survives navigation, login, and logout.
 */
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { locale, setLocale } = useLocale();

  return (
    <div className={`flex items-center bg-white/70 rounded-full p-0.5 border border-white/60 ${className || ""}`}>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
          locale === "en" ? "bg-[#0A182E] text-white" : "text-[#0A182E]/70 hover:text-[#0A182E]"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("nl")}
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
          locale === "nl" ? "bg-[#0A182E] text-white" : "text-[#0A182E]/70 hover:text-[#0A182E]"
        }`}
        aria-pressed={locale === "nl"}
      >
        NL
      </button>
    </div>
  );
};
