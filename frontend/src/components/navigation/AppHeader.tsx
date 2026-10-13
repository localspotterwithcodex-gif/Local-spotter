"use client";

import React from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCart } from "@/features/cart/CartContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleContext";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onMenuClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onMenuClick,
}) => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const { itemCount } = useCart();
  const { t } = useLocale();

  return (
    <header className="w-full bg-[#FCE1F0] pt-4 pb-4 px-4 shadow-2xs border-b border-[#F4D0E2] relative z-30">
      {/* Top bar with logo and quick actions */}
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-[#0A182E]" />
          </button>
          
          <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
            <img
              src="/logo.png"
              alt="LocalSpotter Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <Link
            href="/cart"
            className="p-2 rounded-full hover:bg-black/5 transition-colors relative"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[#0A182E]" />
            {itemCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#EA89B1] rounded-full" />}
          </Link>

          {isAuthenticated ? (
            <>
              {role !== "SUPER_ADMIN" && (
                <Link
                  href={role === "BUSINESS_OWNER" ? "/owner" : "/account"}
                  className="flex items-center gap-2 p-1 pl-2 w-fit bg-white/80 backdrop-blur-sm rounded-full border border-white/60 shadow-2xs"
                >
                  <span className="text-xs font-bold text-[#0A182E] max-w-[90px] truncate hidden sm:inline">
                    {user?.name}
                  </span>
                  <div className="w-7 h-7 shrink-0 rounded-full bg-[#0A182E] text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                    {user?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                </Link>
              )}

              {/* Always-visible Logout text button while signed in (PROMPT.md item 3) */}
              <button
                type="button"
                onClick={logout}
                aria-label={t("account.logout")}
                className="flex items-center gap-1.5 p-2 sm:px-3 rounded-full bg-white/80 hover:bg-white text-xs font-bold text-[#0A182E] transition-colors shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("account.logout")}</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold text-white bg-[#EA89B1] px-4 py-1.5 rounded-full shadow-2xs hover:bg-[#D977A0] transition-all"
            >
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>

      {/* Optional title or header subtitle */}
      {title && (
        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{title}</h1>
        </div>
      )}
    </header>
  );
};
