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
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
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
  const { business } = useMyBusiness();
  const businessId = business?.id ?? null;
  const subRes = useApiResource(businessId && `owner-subscription:${businessId}`, () => api.getBusinessSubscription(businessId!));
  const plansRes = useApiResource("subscription-plans", () => api.getSubscriptionPlans());
  const sub = subRes.data ?? null;
  const planName = sub ? (plansRes.data?.find((p) => p.slug === sub.planSlug)?.name ?? sub.planSlug) : null;
  const subActive = sub?.status === "ACTIVE";

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
            {t("ownerx.sidebar.currentPlan")}
          </span>
          {planName && (
            <span className="text-xs font-bold text-[#FA1EFF] bg-white px-2 py-0.5 rounded-full">{planName}</span>
          )}
        </div>
        <p className="text-xs text-[#111111] font-medium">
          {subActive ? t("ownerx.sidebar.allFeatures") : sub ? t("ownerx.sidebar.inactive") : t("ownerx.sidebar.noPlan")}
        </p>
      </div>
    </aside>
  );
};
