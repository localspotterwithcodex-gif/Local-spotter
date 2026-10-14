"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { AdminPager } from "../_components/AdminPager";

const PAGE_SIZE = 20;

export default function AdminPaymentsPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-payments-${offset}`, () =>
    adminApi.getPayments({ limit: PAGE_SIZE, offset })
  );
  const payments = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.paymentsLog")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.pay.subtitle")}</p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || payments.length === 0 ? (
          <EmptyState title={t("adminx.pay.emptyTitle")} description={t("adminx.pay.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">{t("adminx.pay.colCustomerShop")}</th>
                    <th className="p-4">{t("adminx.pay.colType")}</th>
                    <th className="p-4">{t("adminx.pay.colMethod")}</th>
                    <th className="p-4">{t("adminx.pay.colAmount")}</th>
                    <th className="p-4">{t("common.status")}</th>
                    <th className="p-4">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-4 font-mono font-bold">{p.id.slice(0, 8)}</td>
                      <td className="p-4 font-bold text-[#111111]">{p.businessName}</td>
                      <td className="p-4 text-[#555555]">{label("purpose", p.type)}</td>
                      <td className="p-4">{label("method", p.method)}</td>
                      <td className="p-4 font-extrabold">{f.currency(p.amount)}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "completed"
                              : p.status === "PENDING" || p.status === "AUTHORIZED"
                                ? "processing"
                                : "cancelled"
                          }
                        >
                          {label("status", p.status)}
                        </Badge>
                      </td>
                      <td className="p-4 text-[#B7B7B7]">{f.date(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPager meta={data.meta} onOffsetChange={setOffset} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
