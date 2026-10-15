import { ShieldCheck, Users, Store, ShoppingBag, Package, Star, CreditCard, Crown, FileCheck, type LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/i18n/dictionaries";

export interface NavLinkItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavLinks = (t: (key: TranslationKey) => string): NavLinkItem[] => [
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
