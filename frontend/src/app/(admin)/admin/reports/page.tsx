"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, reportCsvUrl } from "@/lib/api/admin";

const PLANS = ["WEBSHOP", "SHOPROUTES", "WORKSHOP"] as const;
const FIELD = "h-10 inline-flex items-center bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3 text-[#111111] disabled:opacity-50";

/** Current month in Amsterdam time, as YYYY-MM. */
const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit" }).format(new Date());

export default function AdminReportsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const [month, setMonth] = useState(thisMonth);
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const eur = (cents: number) => f.currency(cents / 100);

  const totals = useApiResource(`admin-report-${month}`, () => adminApi.getMonthlyReport(month));
  const shops = useApiResource(`admin-report-shops-${month}-${plan}-${page}`, () =>
    adminApi.getShopReports({ month, plan: plan || undefined, page })
  );
  const m = totals.data;
  const tiles = m
    ? [
        [t("adminx.reports.orders"), String(m.orders)],
        [t("adminx.reports.bookings"), String(m.workshopBookings)],
        [t("adminx.reports.gross"), eur(m.grossSalesCents)],
        [t("adminx.reports.refunds"), eur(m.refundsCents)],
        [t("adminx.reports.commission"), eur(m.commissionCents)],
        [t("adminx.reports.subscriptions"), eur(m.subscriptionRevenueCents)],
        [t("adminx.reports.payoutsCreated"), `${eur(m.payoutsCreated.cents)} (${m.payoutsCreated.count})`],
        [t("adminx.reports.payoutsPaid"), `${eur(m.payoutsPaid.cents)} (${m.payoutsPaid.count})`],
      ]
    : [];
  const pages = shops.data ? Math.max(1, Math.ceil(shops.data.total / shops.data.pageSize)) : 1;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA] flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("adminx.reports.title")}</h1>
            <p className="text-xs text-ls-muted">{t("adminx.reports.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-ls-muted flex flex-col gap-1">
              {t("adminx.reports.month")}
              <input
                type="month"
                value={month}
                max={thisMonth()}
                onChange={(e) => {
                  if (e.target.value) {
                    setMonth(e.target.value);
                    setPage(1);
                  }
                }}
                className={FIELD}
              />
            </label>
            <a href={reportCsvUrl("monthly", { month })} className={`${FIELD} hover:bg-[#F9F9F9]`} download>
              {t("adminx.reports.csv")}
            </a>
          </div>
        </div>

        {totals.error ? (
          <ErrorState message={totals.error} onRetry={totals.reload} />
        ) : totals.loading || !m ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tiles.map(([label, value]) => (
                <div key={label} className="bg-white rounded-2xl border border-[#EAEAEA] p-4">
                  <p className="text-xs text-ls-muted">{label}</p>
                  <p className="text-lg font-extrabold text-[#111111]">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#111111] text-white rounded-2xl p-4 flex items-center justify-between">
              <p className="text-xs font-bold">{t("adminx.reports.net")}</p>
              <p className="text-xl font-extrabold">{eur(m.netPlatformRevenueCents)}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("adminx.reports.shops")}</h2>
          <div className="flex gap-2">
            <select
              aria-label={t("adminx.reports.colPlan")}
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className={FIELD}
            >
              <option value="">{t("adminx.reports.allPlans")}</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <a href={reportCsvUrl("businesses", { month, plan: plan || undefined, page })} className={`${FIELD} hover:bg-[#F9F9F9]`} download>
              {t("adminx.reports.csv")}
            </a>
          </div>
        </div>

        {shops.error ? (
          <ErrorState message={shops.error} onRetry={shops.reload} />
        ) : shops.loading ? (
          <LoadingState />
        ) : !shops.data || shops.data.items.length === 0 ? (
          <EmptyState title={t("adminx.reports.emptyTitle")} description={t("adminx.reports.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-3">{t("adminx.reports.colShop")}</th>
                    <th className="p-3">{t("adminx.reports.colPlan")}</th>
                    <th className="p-3">{t("adminx.reports.orders")}</th>
                    <th className="p-3">{t("adminx.reports.gross")}</th>
                    <th className="p-3">{t("adminx.reports.refunds")}</th>
                    <th className="p-3">{t("adminx.reports.colRate")}</th>
                    <th className="p-3">{t("adminx.reports.commission")}</th>
                    <th className="p-3">{t("adminx.reports.colNet")}</th>
                    <th className="p-3">{t("adminx.reports.colPayout")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {shops.data.items.map((s) => (
                    <tr key={s.businessId} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-3 font-bold text-[#111111]">{s.name}</td>
                      <td className="p-3">{s.plan ?? "—"}</td>
                      <td className="p-3">{s.orders}</td>
                      <td className="p-3">{eur(s.grossSalesCents)}</td>
                      <td className="p-3">{eur(s.refundsCents)}</td>
                      <td className="p-3">{(s.commissionRateBps / 100).toLocaleString()}%</td>
                      <td className="p-3">{eur(s.commissionCents)}</td>
                      <td className="p-3 font-extrabold">{eur(s.netOwedCents)}</td>
                      <td className="p-3 text-ls-muted">{s.payoutStatus ? `${s.payoutStatus} · ${eur(s.payoutCents)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2 p-3 border-t border-[#EAEAEA] text-xs">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={FIELD}>
                  {t("adminx.pager.previous")}
                </button>
                <span className="text-ls-muted">
                  {page} / {pages}
                </span>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={FIELD}>
                  {t("adminx.pager.next")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
