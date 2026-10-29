"use client";

import React from "react";
import Link from "next/link";
import { User, MapPin, ShoppingBag, Heart, Star, Languages, Bell, FileText, LifeBuoy, ChevronRight, type LucideIcon, Users, ShieldCheck, Trash2 } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleContext";
import { useAuth } from "@/features/auth/AuthContext";
import { ReviewReminders } from "@/features/reviews/ReviewReminders";
import { GuestClaimCard } from "@/features/guest/GuestClaimCard";

interface Row {
  label: string;
  href?: string;
  icon: LucideIcon;
  tint: string;
}

/** Account settings: the card list from the Figma Settings frame (every row is a working link or control). */
export default function AccountPage() {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  // Guests only have orders (and can turn the guest account into a real one).
  const guestRows: Row[] = [
    { label: t("account.myOrders"), href: "/account/orders", icon: ShoppingBag, tint: "bg-[#FCEFC3] text-[#D4A011]" },
    { label: t("manage.settings.terms"), href: "/terms", icon: FileText, tint: "bg-[#E4E4E4] text-[#121F3E]" },
    { label: t("manage.settings.help"), href: "/help", icon: LifeBuoy, tint: "bg-[#CFF1F1] text-[#1E9AA0]" },
  ];
  const memberRows: Row[] = [
    { label: t("account.info"), href: "/account/profile", icon: User, tint: "bg-[#CFE6FA] text-[#2F7FD6]" },
    { label: t("account.deliveryAddress"), href: "/account/addresses", icon: MapPin, tint: "bg-[#FBD9D3] text-[#E5533D]" },
    { label: t("account.myOrders"), href: "/account/orders", icon: ShoppingBag, tint: "bg-[#FCEFC3] text-[#D4A011]" },
    { label: t("account.followedStores"), href: "/account/following", icon: Heart, tint: "bg-[#FAD6DC] text-[#ED4C5C]" },
    { label: t("favorites.title"), href: "/account/favorites", icon: Heart, tint: "bg-[#FAD6DC] text-[#ED4C5C]" },
    { label: t("account.myReviews"), href: "/account/reviews", icon: Star, tint: "bg-[#D5F2E3] text-[#2E9E6B]" },
    { label: t("manage.settings.notifications"), href: "/notifications", icon: Bell, tint: "bg-[#FAE2F0] text-[#FA1EFF]" },
    { label: t("staff.title"), href: "/staff", icon: Users, tint: "bg-[#DDE4FA] text-[#4D5BD6]" },
    { label: t("privacySettings.title"), href: "/privacy-settings", icon: ShieldCheck, tint: "bg-[#D5F2E3] text-[#2E9E6B]" },
    { label: t("privacySettings.deleteTitle"), href: "/privacy-settings", icon: Trash2, tint: "bg-[#F2D9DE] text-[#ED4C5C]" },
    { label: t("manage.settings.terms"), href: "/terms", icon: FileText, tint: "bg-[#E4E4E4] text-[#121F3E]" },
    { label: t("manage.settings.help"), href: "/help", icon: LifeBuoy, tint: "bg-[#CFF1F1] text-[#1E9AA0]" },
    { label: t("account.language"), icon: Languages, tint: "bg-[#DDE4FA] text-[#4D5BD6]" },
  ];
  const rows = user?.isGuest ? guestRows : memberRows;

  return (
    <ConsumerLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#121F3E] text-white flex items-center justify-center font-bold text-lg">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold font-rubik text-[#111111] truncate">{user?.name || t("account.consumerFallback")}</h1>
            <p className="text-xs text-[#B7B7B7] truncate">{user?.email ?? ""}</p>
          </div>
        </div>

        <GuestClaimCard />

        {!user?.isGuest && <ReviewReminders />}

        <ul className="space-y-3">
          {rows.map((r) => {
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
              <li key={r.label}>
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

        <button
          type="button"
          onClick={logout}
          className="w-full h-12 bg-white rounded-xl shadow-sm text-xs font-bold text-[#ED4C5C] hover:bg-[#F2D9DE]/40"
        >
          {t("account.logout")}
        </button>
      </div>
    </ConsumerLayout>
  );
}
