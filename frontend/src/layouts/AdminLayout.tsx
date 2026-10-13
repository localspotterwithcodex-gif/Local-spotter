"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Store,
  ShoppingBag,
  Package,
  Star,
  CreditCard,
  Crown,
  FileCheck,
  LogOut,
} from "lucide-react";
import { TopNav } from "@/components/navigation/TopNav";
import { AppHeader } from "@/components/navigation/AppHeader";
import { BottomNav } from "@/components/navigation/BottomNav";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useLocale();

  const adminLinks = [
    { label: t("admin.overview"), href: "/admin", icon: ShieldCheck },
    { label: t("admin.userManagement"), href: "/admin/users", icon: Users },
    { label: t("admin.businessesApproval"), href: "/admin/businesses", icon: Store },
    { label: t("admin.productModeration"), href: "/admin/products", icon: Package },
    { label: t("admin.ordersOverview"), href: "/admin/orders", icon: ShoppingBag },
    { label: t("admin.reviewModeration"), href: "/admin/reviews", icon: Star },
    { label: t("admin.paymentsLog"), href: "/admin/payments", icon: CreditCard },
    { label: t("admin.payoutsApproval"), href: "/admin/payouts", icon: FileCheck },
    { label: t("admin.subscriptionsManagement"), href: "/admin/subscriptions", icon: Crown },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F9]">
      <div className="md:hidden">
        <AppHeader title={t("admin.panelTitle")} />
      </div>
      <TopNav />

      {/* Admin section quick links — the sidebar below is desktop-only
          (`hidden md:flex`), so without this, mobile admins had no way to
          reach Users / Businesses / Products / Orders / etc. at all. */}
      <nav className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-[#EAEAEA]">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                isActive ? "bg-[#790166] text-white" : "bg-[#F9F9F9] text-[#111111]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FA1EFF]" : "text-[#B7B7B7]"}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-white border-r border-[#EAEAEA] min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-4">
            <div className="p-3 bg-[#790166] text-white rounded-2xl flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-[#FA1EFF]" />
              <div>
                <span className="block text-xs font-bold font-rubik">LocalSpotter</span>
                <span className="block text-[10px] text-white/80">{t("admin.panelTitle")}</span>
              </div>
            </div>

            <nav className="space-y-1 pt-2">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#790166] text-white shadow-xs"
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

          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs font-bold text-[#ED4C5C] p-3 rounded-xl hover:bg-[#F2D9DE]/40 transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t("admin.logoutAdmin")}
          </button>
        </aside>

        <main className="flex-1 p-4 md:p-8 pb-28 md:pb-12 w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
