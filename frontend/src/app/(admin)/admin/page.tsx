"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  FileCheck,
  Crown,
  Percent,
  Receipt,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  MapPin,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleContext";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { useFormat } from "@/i18n/useFormat";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { BarList, CHART_COLORS, Donut, ShopGrowthChart, TrendChart } from "@/components/charts/AdminCharts";
import type { AnalyticsKpi } from "@/lib/api/admin";

const PERIODS = [7, 30, 90] as const;

function KpiTile({ label, value, icon: Icon, color, kpi, unit, vsLabel }: { label: string; value: string; icon: LucideIcon; color: string; kpi: AnalyticsKpi; unit: "%" | "pp"; vsLabel: string }) {
  const d = kpi.deltaPct;
  const up = d !== null && d > 0;
  const down = d !== null && d < 0;
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-2xs space-y-2">
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <span className="text-xs font-bold text-[#6B6B6B]">{label}</span>
      </div>
      <span className="block text-2xl font-extrabold font-rubik text-[#111111]">{value}</span>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold ${up ? "bg-green-50 text-green-700" : down ? "bg-red-50 text-red-600" : "bg-[#F2F2F2] text-[#6B6B6B]"}`}
        >
          {up && <ArrowUp className="h-3 w-3" aria-hidden="true" />}
          {down && <ArrowDown className="h-3 w-3" aria-hidden="true" />}
          {d === null ? "—" : `${Math.abs(d)}${unit === "pp" ? " pp" : "%"}`}
        </span>
        <span className="text-[#B7B7B7]">{vsLabel}</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [days, setDays] = useState<number>(30);
  const [region, setRegion] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const analytics = useApiResource(`admin-analytics-${days}-${region}-${categoryId}`, async () => {
    const [data, categories] = await Promise.all([adminApi.getAnalytics({ days, region, categoryId }), api.getBusinessCategories()]);
    return { data, categories };
  });
  const an = analytics.data?.data;
  const shortDay = (iso: string) => f.date(`${iso}T00:00:00Z`, { day: "2-digit", month: "short", timeZone: "UTC" });
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

  const firstShop = data?.pendingShops.items[0];
  const firstPayout = data?.pendingPayouts.items[0];
  const pendingPayoutCount = data?.pendingPayouts.meta.total ?? 0;
  const pendingShopCount = data?.pendingShops.meta.total ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">{t("adminx.an.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.an.subtitle")}</p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/payouts">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs bg-[#790166] hover:bg-[#5C014E]">
                <FileCheck className="w-4 h-4" /> {t("admin.approvePayouts").replace("{n}", String(pendingPayoutCount))}
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics */}
        <section aria-label={t("adminx.an.title")} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { icon: CalendarDays, label: t("adminx.an.period"), value: String(days), onChange: (v: string) => setDays(Number(v)), options: PERIODS.map((p) => ({ value: String(p), label: t("adminx.an.lastDays", { n: p }) })), all: null },
              { icon: MapPin, label: t("adminx.an.region"), value: region, onChange: setRegion, options: (an?.regions ?? []).map((r) => ({ value: r, label: r })), all: t("adminx.an.allRegions") },
              { icon: Tag, label: t("adminx.an.category"), value: categoryId, onChange: setCategoryId, options: (analytics.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })), all: t("adminx.an.allCategories") },
            ].map((s) => (
              <label key={s.label} className="relative block">
                <span className="sr-only">{s.label}</span>
                <s.icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" aria-hidden="true" />
                <select
                  value={s.value}
                  onChange={(e) => s.onChange(e.target.value)}
                  className="h-10 min-w-40 rounded-xl border border-[#EAEAEA] bg-white pl-9 pr-3 text-xs font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                >
                  {s.all !== null && <option value="">{s.all}</option>}
                  {s.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {analytics.error ? (
            <ErrorState message={analytics.error} onRetry={analytics.reload} />
          ) : analytics.loading || !an ? (
            <LoadingState />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {(
                  [
                    [t("admin.totalUsers"), String(an.kpis.totalUsers.value.toLocaleString()), Users, "bg-blue-50 text-blue-600", an.kpis.totalUsers, "%"],
                    [t("admin.activeShops"), String(an.kpis.activeShops.value.toLocaleString()), Store, "bg-emerald-50 text-emerald-600", an.kpis.activeShops, "%"],
                    [t("admin.totalOrders"), String(an.kpis.totalOrders.value.toLocaleString()), ShoppingBag, "bg-purple-50 text-purple-600", an.kpis.totalOrders, "%"],
                    [t("adminx.an.grossRevenue"), f.currency(an.kpis.grossRevenue.value), CreditCard, "bg-orange-50 text-orange-600", an.kpis.grossRevenue, "%"],
                    [t("adminx.an.conversion"), `${an.kpis.conversionRate.value}%`, Percent, "bg-pink-50 text-[#FA1EFF]", an.kpis.conversionRate, "pp"],
                    [t("adminx.an.aov"), f.currency(an.kpis.averageOrderValue.value), Receipt, "bg-teal-50 text-teal-600", an.kpis.averageOrderValue, "%"],
                  ] as [string, string, LucideIcon, string, AnalyticsKpi, "%" | "pp"][]
                ).map(([lbl, val, icon, color, kpi, unit]) => (
                  <KpiTile key={lbl} label={lbl} value={val} icon={icon} color={color} kpi={kpi} unit={unit} vsLabel={t("adminx.an.vsPrevious", { n: an.period.days })} />
                ))}
              </div>
              <p className="text-[11px] text-[#B7B7B7]">{t("adminx.an.conversionHelp")}</p>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="min-w-0 overflow-hidden lg:col-span-3 bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-2xs">
                  <TrendChart
                    data={an.trend}
                    title={t("adminx.an.trend")}
                    labels={{ revenue: t("adminx.an.revenue"), orders: t("adminx.an.orders"), date: t("adminx.an.date") }}
                    formatMoney={f.currency}
                    formatDay={shortDay}
                    empty={t("adminx.an.noData")}
                  />
                </div>
                <div className="min-w-0 overflow-hidden lg:col-span-2 bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-2xs">
                  <BarList
                    title={t("adminx.an.byCategory")}
                    items={an.revenueByCategory.map((c) => ({ name: c.name, value: c.revenue, share: c.share }))}
                    formatValue={f.currency}
                    empty={t("adminx.an.noData")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1.4fr] gap-4">
                <div className="min-w-0 overflow-hidden bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-2xs">
                  <ShopGrowthChart
                    data={an.shopGrowth}
                    title={t("adminx.an.shopGrowth")}
                    labels={{ newShops: t("adminx.an.newShops"), activeShops: t("adminx.an.existingShops"), date: t("adminx.an.date") }}
                    formatDay={shortDay}
                    empty={t("adminx.an.noData")}
                  />
                </div>
                <div className="min-w-0 overflow-hidden bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-2xs">
                  <Donut
                    title={t("adminx.an.userDistribution")}
                    centerLabel={t("adminx.an.totalUsersCenter")}
                    empty={t("adminx.an.noData")}
                    segments={an.userDistribution.map((u, i) => ({
                      name: label("role", u.role),
                      value: u.count,
                      share: u.share,
                      color: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary][i % 3],
                    }))}
                  />
                </div>
                <div className="min-w-0 overflow-hidden md:col-span-2 xl:col-span-1 bg-white p-5 rounded-2xl border border-[#EAEAEA] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold font-rubik text-[#111111]">{t("adminx.an.topShops")}</h3>
                    <Link href="/admin/businesses" className="text-xs font-bold text-[#FA1EFF] hover:underline">{t("adminx.an.viewAll")} →</Link>
                  </div>
                  {an.topShops.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#B7B7B7]">{t("adminx.an.noData")}</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-left text-[#6B6B6B]">
                        <tr>
                          <th className="pb-2 font-bold">#</th>
                          <th className="pb-2 font-bold">{t("adminx.an.colShop")}</th>
                          <th className="pb-2 text-right font-bold">{t("adminx.an.orders")}</th>
                          <th className="pb-2 text-right font-bold">{t("adminx.an.revenue")}</th>
                          <th className="pb-2 text-right font-bold">{t("adminx.an.colGrowth")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2F2F2]">
                        {an.topShops.map((s, i) => (
                          <tr key={s.id}>
                            <td className="py-2 pr-2 text-[#B7B7B7]">{i + 1}</td>
                            <td className="py-2">
                              <span className="flex items-center gap-2 font-bold text-[#111111]"><Avatar src={s.logoUrl} name={s.name} size="sm" shape="square" /> <span className="truncate">{s.name}</span></span>
                            </td>
                            <td className="py-2 text-right">{s.orders}</td>
                            <td className="py-2 text-right font-bold">{f.currency(s.revenue)}</td>
                            <td className={`py-2 text-right font-bold ${s.growthPct === null ? "text-[#B7B7B7]" : s.growthPct >= 0 ? "text-green-700" : "text-red-600"}`}>
                              {s.growthPct === null ? "—" : `${s.growthPct >= 0 ? "↑" : "↓"} ${Math.abs(s.growthPct)}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <LoadingState />
        ) : (
          <>
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
                  <span className="text-[#B7B7B7] block">{t("admin.amount")}: {f.currency(firstPayout.amount)}</span>
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
                      {p.name} ({f.currency(p.price)}{t("adminx.dash.perMonthShort")})
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
