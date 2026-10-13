"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  FileCheck,
  Crown,
  TrendingUp,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleContext";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { t } = useLocale();
  const { data, error, loading, reload } = useApiResource("admin-dashboard", async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [overview, month, pendingShops, pendingPayouts, activeSubs, plans] = await Promise.all([
      adminApi.getDashboard(),
      adminApi.getDashboard({ startDate: monthStart }),
      adminApi.getBusinesses({ status: "PENDING_APPROVAL", limit: 1 }),
      adminApi.getPayouts({ status: "PENDING", limit: 1 }),
      adminApi.getSubscriptions({ status: "ACTIVE", limit: 500 }),
      adminApi.getPlans(),
    ]);
    const counts = new Map<string, number>();
    for (const s of activeSubs.items) counts.set(s.planName, (counts.get(s.planName) ?? 0) + 1);
    return {
      overview,
      monthlyRevenue: month.revenue,
      pendingShops,
      pendingPayouts,
      breakdown: plans.map((p) => ({ id: p.id, name: p.name, price: p.monthlyPrice, shops: counts.get(p.name) ?? 0 })),
    };
  });

  const metrics = data
    ? [
        { label: t("admin.totalUsers"), val: String(data.overview.users.total), icon: Users, color: "bg-blue-50 text-blue-600" },
        { label: t("admin.activeShops"), val: String(data.overview.businesses.active), icon: Store, color: "bg-emerald-50 text-emerald-600" },
        { label: t("admin.totalOrders"), val: String(data.overview.orders.total), icon: ShoppingBag, color: "bg-purple-50 text-purple-600" },
        { label: t("admin.monthlyRevenue"), val: formatCurrency(data.monthlyRevenue), icon: TrendingUp, color: "bg-pink-50 text-[#FA1EFF]" },
      ]
    : [];
  const firstShop = data?.pendingShops.items[0];
  const firstPayout = data?.pendingPayouts.items[0];
  const pendingPayoutCount = data?.pendingPayouts.meta.total ?? 0;
  const pendingShopCount = data?.pendingShops.meta.total ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">{t("admin.platformOverview")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("admin.platformSubtitle")}</p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/payouts">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs bg-[#790166] hover:bg-[#5C014E]">
                <FileCheck className="w-4 h-4" /> {t("admin.approvePayouts").replace("{n}", String(pendingPayoutCount))}
              </Button>
            </Link>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <LoadingState />
        ) : (
          <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B7B7B7]">{m.label}</span>
                    <div className={`p-2 rounded-xl ${m.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-2xl font-extrabold font-rubik text-[#111111] block">{m.val}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Admin Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Pending Business Approvals */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#FA1EFF]" /> {t("admin.shopsPendingApproval")}
                </h3>
                <span className="bg-[#FAE2F0] text-[#FA1EFF] text-xs font-bold px-2 py-0.5 rounded-full">{pendingShopCount} {t("admin.new")}</span>
              </div>

              {firstShop ? (
                <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-[#111111] block">{firstShop.name}</span>
                  <span className="text-[#B7B7B7] block">KVK: {firstShop.kvkNumber} • {firstShop.city}</span>
                  <Link href="/admin/businesses" className="text-xs font-bold text-[#FA1EFF] hover:underline pt-1 inline-block">
                    {t("admin.viewAndApprove")} →
                  </Link>
                </div>
              ) : (
                <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs text-[#B7B7B7]">-</div>
              )}
            </div>

            {/* Pending Payout Requests */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#54D1CA]" /> {t("admin.payoutRequests")}
                </h3>
                <span className="bg-[#E8D1ED] text-[#C04BDA] text-xs font-bold px-2 py-0.5 rounded-full">{pendingPayoutCount} {t("admin.pending")}</span>
              </div>

              {firstPayout ? (
                <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-[#111111] block">{firstPayout.businessName}</span>
                  <span className="text-[#B7B7B7] block">{t("admin.amount")}: {formatCurrency(firstPayout.amount)}</span>
                  <Link href="/admin/payouts" className="text-xs font-bold text-[#54D1CA] hover:underline pt-1 inline-block">
                    {t("admin.review")} →
                  </Link>
                </div>
              ) : (
                <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs text-[#B7B7B7]">-</div>
              )}
            </div>

            {/* Subscription Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
              <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#790166]" /> {t("admin.subscriptionBreakdown")}
              </h3>

              <div className="space-y-2 text-xs">
                {data?.breakdown.map((p) => (
                  <div key={p.id} className="flex justify-between items-center">
                    <span className="text-[#555555]">
                      {p.name} ({formatCurrency(p.price)}/mnd)
                    </span>
                    <span className="font-bold text-[#111111]">
                      {p.shops} {t("admin.shops")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
