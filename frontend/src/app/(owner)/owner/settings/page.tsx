"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Store, MapPin, Crown, CreditCard, Languages, Bell, FileText, LifeBuoy, Users, Truck, ShieldCheck, ChevronRight, type LucideIcon } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";

interface Row {
  key: string;
  label: string;
  href?: string;
  icon: LucideIcon;
  tint: string;
}

/** Owner "Settings" hub: the card list from the Figma Settings frame. */
export default function OwnerSettingsHubPage() {
  const { t } = useLocale();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const rows: Row[] = [
    { key: "store", label: t("manage.settings.store"), href: "/owner/settings/store", icon: Store, tint: "bg-[#CFE6FA] text-[#2F7FD6]" },
    { key: "location", label: t("manage.settings.location"), href: "/owner/shoproutes/location", icon: MapPin, tint: "bg-[#FBD9D3] text-[#E5533D]" },
    { key: "subscription", label: t("manage.settings.subscription"), href: "/owner/subscription", icon: Crown, tint: "bg-[#FCEFC3] text-[#D4A011]" },
    { key: "fulfilment", label: t("fulfilmentSettings.title"), href: "/owner/settings/fulfilment", icon: Truck, tint: "bg-[#CFF1F1] text-[#1E9AA0]" },
    { key: "team", label: t("team.title"), href: "/owner/settings/team", icon: Users, tint: "bg-[#DDE4FA] text-[#4D5BD6]" },
    { key: "payouts", label: t("manage.settings.payouts"), href: "/owner/payouts", icon: CreditCard, tint: "bg-[#D5F2E3] text-[#2E9E6B]" },
    { key: "notifications", label: t("manage.settings.notifications"), href: "/notifications", icon: Bell, tint: "bg-[#FAE2F0] text-[#FA1EFF]" },
    { key: "privacy", label: t("privacySettings.title"), href: "/privacy-settings", icon: ShieldCheck, tint: "bg-[#D5F2E3] text-[#2E9E6B]" },
    { key: "terms", label: t("manage.settings.terms"), href: "/terms", icon: FileText, tint: "bg-[#E4E4E4] text-[#121F3E]" },
    { key: "help", label: t("manage.settings.help"), href: "/help", icon: LifeBuoy, tint: "bg-[#CFF1F1] text-[#1E9AA0]" },
    { key: "language", label: t("manage.settings.language"), icon: Languages, tint: "bg-[#DDE4FA] text-[#4D5BD6]" },
  ];
  const visible = rows.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <OwnerLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.settings.title")}</h1>
          <button
            type="button"
            onClick={() => setSearching((v) => !v)}
            aria-label={t("manage.settings.search")}
            aria-expanded={searching}
            className="w-9 h-9 rounded-full bg-[#FAE2F0] text-[#121F3E] flex items-center justify-center"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {searching && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("manage.settings.search")}
            aria-label={t("manage.settings.search")}
            className="w-full h-11 bg-[#EAEAEA] rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
        )}

        <ul className="space-y-3">
          {visible.map((r) => {
            const Icon = r.icon;
            const inner = (
              <>
                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${r.tint}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 text-xs font-bold text-[#121F3E]">{r.label}</span>
                {r.href ? <ChevronRight className="w-4 h-4 text-[#B7B7B7]" /> : <LanguageSwitcher className="bg-[#F4F5FA]" />}
              </>
            );
            return (
              <li key={r.key}>
                {r.href ? (
                  <Link href={r.href} className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-4 h-14 hover:shadow-md transition-shadow">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm px-4 h-14">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
        {visible.length === 0 && <p className="text-xs text-[#B7B7B7] text-center">{t("manage.settings.noResults")}</p>}

        <button
          type="button"
          onClick={logout}
          className="w-full h-12 bg-white rounded-xl shadow-sm text-xs font-bold text-[#ED4C5C] hover:bg-[#F2D9DE]/40"
        >
          {t("manage.settings.logout")}
        </button>
      </div>
    </OwnerLayout>
  );
}
