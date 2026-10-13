"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  PackagePlus,
  ShoppingBag,
  Calendar,
  MapPin,
  CreditCard,
  Crown,
  Settings,
} from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { TranslationKey } from "@/i18n/dictionaries";

export const ownerSidebarLinks = (t: (key: TranslationKey) => string) => [
  { label: t("owner.myShop"), href: "/owner", icon: Store },
  { label: t("owner.addProduct"), href: "/owner/products/new", icon: PackagePlus },
  { label: t("owner.orders"), href: "/owner/orders", icon: ShoppingBag },
  { label: t("owner.workshopBookings"), href: "/owner/workshop-bookings", icon: Calendar },
  { label: t("owner.shoppingRouteLocation"), href: "/owner/shoproutes/location", icon: MapPin },
  { label: t("owner.payoutsBalance"), href: "/owner/payouts", icon: CreditCard },
  { label: t("owner.manageSubscription"), href: "/owner/subscription", icon: Crown },
  { label: t("owner.storeSettings"), href: "/owner/settings", icon: Settings },
];

export const OwnerSidebar: React.FC = () => {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = ownerSidebarLinks(t);

  return (
    <aside className="w-64 bg-white border-r border-[#EAEAEA] min-h-[calc(100vh-4rem)] p-4 flex-col justify-between hidden md:flex">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold text-[#B7B7B7] uppercase tracking-wider px-3">
            {t("nav.businessDashboard")}
          </span>
          <nav className="mt-2 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/owner"
                  ? pathname === "/owner" || pathname === "/owner/business"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#FAE2F0] text-[#FA1EFF]"
                      : "text-[#111111] hover:bg-[#F9F9F9]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#FA1EFF]" : "text-[#B7B7B7]"}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Subscription plan badge at bottom */}
      <div className="p-3 bg-[#FAE2F0]/60 rounded-xl border border-[#FAE2F0]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#790166]">
            Huidig Plan
          </span>
          <span className="text-xs font-bold text-[#FA1EFF] bg-white px-2 py-0.5 rounded-full">
            Workshop
          </span>
        </div>
        <p className="text-xs text-[#111111] font-medium">Alle functionaliteiten actief</p>
      </div>
    </aside>
  );
};

/**
 * Mobile equivalent of the sidebar above. `OwnerSidebar` itself is
 * `hidden md:flex`, so on a phone-width viewport owners previously had no
 * way to reach Orders / Workshop Bookings / Location / Payouts /
 * Subscription / Settings — only the "Business Dashboard" tab on the
 * bottom nav (which lands on `/owner` and stops there). This renders as
 * its own full-width row (not a flex sibling of the sidebar/main row), so
 * it must be placed directly in `OwnerLayout`, above that row.
 */
export const OwnerMobileSubNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useLocale();
  const links = ownerSidebarLinks(t);

  return (
    <nav className="md:hidden w-full flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-[#EAEAEA]">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          link.href === "/owner"
            ? pathname === "/owner" || pathname === "/owner/business"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              isActive ? "bg-[#FA1EFF] text-white" : "bg-[#F9F9F9] text-[#111111]"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#B7B7B7]"}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
