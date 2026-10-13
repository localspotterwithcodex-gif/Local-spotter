"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, MapPin, Calendar, User, Store, ShieldCheck, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";

/**
 * Mobile bottom navigation.
 *
 * `TopNav` (desktop) already lets every role reach Products / Local Shops /
 * Shop Routes / Workshops — but it's `hidden md:block`, and the previous
 * version of this component only exposed those four pages to consumers.
 * Business owners and admins had no mobile path to them at all, and admins
 * had no mobile nav whatsoever (`AdminLayout` didn't even render this
 * component). Every role now gets the same four browse tabs plus a 5th tab
 * back to whatever "home base" makes sense for them (account, business
 * portal, or admin portal).
 */
export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { role } = useAuth();
  const { t } = useLocale();

  const browseItems = [
    { label: t("nav.products"), href: "/products", icon: ShoppingBag },
    { label: t("nav.localShops"), href: "/businesses", icon: Store },
    { label: t("nav.shopRoutes"), href: "/shoproutes", icon: MapPin },
    { label: t("nav.workshops"), href: "/workshops", icon: Calendar },
  ];

  const portalItem =
    role === "SUPER_ADMIN"
      ? { label: t("nav.admin"), href: "/admin", icon: ShieldCheck }
      : role === "BUSINESS_OWNER"
        ? { label: t("nav.businessDashboard"), href: "/owner", icon: LayoutDashboard }
        : { label: t("nav.account"), href: "/account", icon: User };

  const items = [...browseItems, portalItem];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 ls-bottom-nav h-[97px] px-2 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 w-16 group"
          >
            <div className="relative p-1">
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? "text-[#EA89B1]" : "text-[#B7B7B7] group-hover:text-[#0A182E]"
                }`}
              />
              {/* Active dot indicator from Figma */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#EA89B1] rounded-full" />
              )}
            </div>
            <span
              className={`text-[10px] font-medium text-center leading-tight transition-colors ${
                isActive ? "text-[#EA89B1] font-bold" : "text-[#B7B7B7]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
