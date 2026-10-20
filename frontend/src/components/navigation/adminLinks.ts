import { ShieldCheck, Users, Store, ShoppingBag, Package, Star, CreditCard, Crown, FileCheck, Route, Presentation, MessageSquareWarning, Tags, Languages, Percent, Undo2, type LucideIcon } from "lucide-react";
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
  { label: t("admin.routesModeration"), href: "/admin/shoproutes", icon: Route },
  { label: t("admin.workshopsOverview"), href: "/admin/workshops", icon: Presentation },
  { label: t("admin.chatReports"), href: "/admin/chat-reports", icon: MessageSquareWarning },
  { label: t("admin.categories"), href: "/admin/categories", icon: Tags },
  { label: t("admin.translationStatus"), href: "/admin/translation", icon: Languages },
  { label: t("admin.ordersOverview"), href: "/admin/orders", icon: ShoppingBag },
  { label: t("admin.reviewModeration"), href: "/admin/reviews", icon: Star },
  { label: t("admin.paymentsLog"), href: "/admin/payments", icon: CreditCard },
  { label: t("admin.payoutsApproval"), href: "/admin/payouts", icon: FileCheck },
  { label: t("admin.commission"), href: "/admin/commission", icon: Percent },
  { label: t("admin.returnsOverview"), href: "/admin/returns", icon: Undo2 },
  { label: t("admin.subscriptionsManagement"), href: "/admin/subscriptions", icon: Crown },
];
