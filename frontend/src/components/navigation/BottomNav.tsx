"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, MessageCircle, Settings, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/hooks/usePolling";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Extra path prefixes that also mark this tab as active. */
  match?: string[];
}

/**
 * Mobile bottom navigation, as drawn in the Figma app frames: four icon-only
 * tabs on a white bar with rounded top corners, the active tab in the brand
 * magenta with a dot underneath, and a home-indicator bar at the bottom.
 * Everything else (browse pages, account, owner tools) is in the header menu.
 */
export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { role, isAuthenticated, user } = useAuth();
  const { t } = useLocale();
  // Unread chat badge; only polled for roles that have a Chat tab.
  const hasChat = (role === "CONSUMER" && user?.isGuest !== true) || role === "BUSINESS_OWNER";
  const unread = usePolling(hasChat && isAuthenticated ? "chat:unread" : null, () => api.getChatUnreadCount(), 30000);
  const unreadCount = hasChat ? (unread.data ?? 0) : 0;

  let items: NavItem[];
  if (role === "SUPER_ADMIN") {
    items = [
      { label: t("manage.nav.admin.overview"), href: "/admin", icon: Home },
      { label: t("manage.nav.admin.users"), href: "/admin/users", icon: Users },
      { label: t("manage.nav.admin.orders"), href: "/admin/orders", icon: Package },
      { label: t("manage.nav.settings"), href: "/admin/subscriptions", icon: Settings },
    ];
  } else if (role === "BUSINESS_OWNER") {
    items = [
      { label: t("manage.nav.home"), href: "/owner", icon: Home, match: ["/owner/products", "/owner/workshops"] },
      { label: t("manage.nav.orders"), href: "/owner/orders", icon: Package },
      { label: t("manage.nav.chat"), href: "/chat", icon: MessageCircle },
      {
        label: t("manage.nav.settings"),
        href: "/owner/settings",
        icon: Settings,
        match: ["/owner/subscription", "/owner/payouts", "/owner/shoproutes", "/notifications", "/terms", "/help"],
      },
    ];
  } else {
    items = [
      { label: t("manage.nav.home"), href: "/", icon: Home, match: ["/products", "/businesses", "/workshops"] },
      { label: t("manage.nav.orders"), href: isAuthenticated ? "/account/orders" : "/login", icon: Package, match: ["/cart", "/checkout"] },
      { label: t("manage.nav.chat"), href: isAuthenticated ? "/chat" : "/login", icon: MessageCircle },
      { label: t("manage.nav.settings"), href: isAuthenticated ? "/account" : "/login", icon: Settings, match: ["/account", "/notifications", "/terms", "/help"] },
    ];
  }

  const isActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/" || (item.match ?? []).some((p) => pathname.startsWith(p));
    const prefixes = [item.href, ...(item.match ?? [])];
    return prefixes.some((p) => (p === "/owner" || p === "/admin" ? pathname === p : pathname.startsWith(p)));
  };

  // /account/orders belongs to the Orders tab, not Settings.
  const active = items.map(isActive);
  if (active[1] && active[3]) active[3] = false;

  return (
    <nav
      aria-label={t("manage.nav.menu")}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 ls-bottom-nav h-[84px] px-6 pt-2 flex flex-col items-center"
    >
      <div className="w-full max-w-[428px] flex items-start justify-around">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active[i] ? "page" : undefined}
              className="flex flex-col items-center gap-1 w-16 py-1"
            >
              <span className="relative">
                <Icon className={`w-6 h-6 ${active[i] ? "text-[#FA1EFF]" : "text-[#B7B7B7]"}`} strokeWidth={active[i] ? 2.4 : 2} />
                {item.href === "/chat" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#ED4C5C] text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${active[i] ? "bg-[#FA1EFF]" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
      <span className="mt-auto mb-2 block w-[134px] h-[5px] rounded-full bg-[#121F3E]" aria-hidden="true" />
    </nav>
  );
};
