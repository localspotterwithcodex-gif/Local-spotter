"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, LogOut, X, Store, MapPin, Calendar, Home } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCart } from "@/features/cart/CartContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleContext";
import { ownerSidebarLinks } from "@/components/navigation/OwnerSidebar";
import { adminNavLinks } from "@/components/navigation/adminLinks";

interface AppHeaderProps {
  /** Page heading, shown left-aligned under the header bar like the Figma "Settings" / "Shopping Route" screens. */
  title?: string;
  showBack?: boolean;
  onMenuClick?: () => void;
}

/**
 * Mobile header from the Figma app frames: pale-pink bar with rounded bottom
 * corners, hamburger on the left, logo, and the avatar on the right. The
 * hamburger opens a side menu with every page the signed-in role can reach.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({ title, onMenuClick }) => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const { itemCount } = useCart();
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const browse = [
    { label: t("manage.nav.home"), href: "/", icon: Home },
    { label: t("nav.products"), href: "/products", icon: ShoppingBag },
    { label: t("nav.localShops"), href: "/businesses", icon: Store },
    { label: t("nav.shopRoutes"), href: "/shoproutes", icon: MapPin },
    { label: t("nav.workshops"), href: "/workshops", icon: Calendar },
  ];
  const roleLinks =
    role === "BUSINESS_OWNER" ? ownerSidebarLinks(t) : role === "SUPER_ADMIN" ? adminNavLinks(t) : [];

  const initial = user?.name?.charAt(0).toUpperCase() || "U";
  const home = role === "BUSINESS_OWNER" ? "/owner" : role === "SUPER_ADMIN" ? "/admin" : "/account";

  const renderLink = (link: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = link.icon;
    const active = link.href === "/" ? pathname === "/" : pathname === link.href || (link.href !== "/owner" && link.href !== "/admin" && pathname.startsWith(link.href));
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${active ? "bg-[#FAE2F0] text-[#FA1EFF]" : "text-[#121F3E] hover:bg-[#F9F9F9]"}`}
      >
        <Icon className={`w-5 h-5 ${active ? "text-[#FA1EFF]" : "text-[#B7B7B7]"}`} />
        {link.label}
      </Link>
    );
  };

  return (
    <>
      <header className="w-full bg-[#FAE2F0] pt-4 pb-4 px-4 rounded-b-[20px] relative z-30">
        <div className="flex items-center justify-between max-w-[428px] mx-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                onMenuClick?.();
              }}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
              aria-label={t("nav2.openMenu")}
              aria-expanded={open}
            >
              <Menu className="w-6 h-6 text-[#121F3E]" />
            </button>
            <Link href="/" className="flex items-center shrink-0 hover:opacity-90 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="LocalSpotter" className="h-9 w-auto object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            {role !== "BUSINESS_OWNER" && role !== "SUPER_ADMIN" && (
              <Link href="/cart" className="p-2 rounded-full hover:bg-black/5 relative" aria-label={t("nav2.cart")}>
                <ShoppingBag className="w-5 h-5 text-[#121F3E]" />
                {itemCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FA1EFF] rounded-full" />}
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                href={home}
                aria-label={user?.name ?? t("nav.account")}
                className="w-9 h-9 shrink-0 rounded-full bg-[#121F3E] text-white flex items-center justify-center text-sm font-bold overflow-hidden"
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </Link>
            ) : (
              <Link href="/login" className="text-xs font-bold text-white bg-[#FA1EFF] px-4 py-2 rounded-full">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {title && (
        <div className="max-w-[428px] mx-auto w-full px-4 pt-4">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{title}</h1>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t("manage.nav.menu")}>
          <button type="button" className="absolute inset-0 bg-black/40" aria-label={t("manage.nav.close")} onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white rounded-r-3xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between bg-[#FAE2F0] rounded-tr-3xl px-4 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="LocalSpotter" className="h-8 w-auto object-contain" />
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-black/5" aria-label={t("manage.nav.close")}>
                <X className="w-5 h-5 text-[#121F3E]" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {browse.map(renderLink)}
              {roleLinks.length > 0 && <div className="my-2 border-t border-[#EAEAEA]" />}
              {roleLinks.map(renderLink)}
            </nav>
            <div className="p-3 border-t border-[#EAEAEA]">
              {isAuthenticated ? (
                <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-[#ED4C5C] hover:bg-[#F2D9DE]/40">
                  <LogOut className="w-5 h-5" /> {t("account.logout")}
                </button>
              ) : (
                <Link href="/login" className="block text-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-[#FA1EFF]">
                  {t("nav.login")}
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
