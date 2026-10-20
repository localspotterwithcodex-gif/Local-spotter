"use client";

import React from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { ReturnStatusBadge } from "@/features/returns/ReturnStatusBadge";

export default function AdminReturnsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading, reload } = useApiResource("admin-returns", () => adminApi.getReturns());

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.returnsOverview")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.returns.subtitle")}</p>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || data.length === 0 ? (
          <EmptyState title={t("returns.shop.emptyTitle")} description={t("adminx.returns.empty")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">{t("adminx.returns.colReturn")}</th>
                  <th className="p-4">{t("adminx.payouts.colShop")}</th>
                  <th className="p-4">{t("adminx.returns.colCustomer")}</th>
                  <th className="p-4">{t("common.status")}</th>
                  <th className="p-4">{t("adminx.returns.colRefund")}</th>
                  <th className="p-4">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="p-4 font-bold text-[#111111]">
                      {r.returnNumber}
                      <span className="block text-[11px] font-normal text-[#B7B7B7]">{r.orderNumber}</span>
                    </td>
                    <td className="p-4">{r.businessName}</td>
                    <td className="p-4">{r.customerName}</td>
                    <td className="p-4"><ReturnStatusBadge status={r.status} /></td>
                    <td className="p-4">
                      {r.refundAmountCents !== null ? f.currency(r.refundAmountCents / 100) : "-"}
                      {r.refundStatus === "FAILED" && <span className="block text-[11px] text-[#E54666] font-bold">{t("adminx.returns.refundFailed")}</span>}
                    </td>
                    <td className="p-4 text-[#B7B7B7]">{f.date(r.requestedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
