"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { AdminPager } from "../_components/AdminPager";

const PAGE_SIZE = 20;

export default function AdminWorkshopsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-workshops-${offset}`, () => adminApi.getWorkshops({ limit: PAGE_SIZE, offset }));
  const items = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.workshopsOverview")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.workshops.subtitle")}</p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || items.length === 0 ? (
          <EmptyState title={t("adminx.workshops.emptyTitle")} description={t("adminx.workshops.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">{t("adminx.workshops.colWorkshop")}</th>
                    <th className="p-4">{t("adminx.routes.colShop")}</th>
                    <th className="p-4">{t("adminx.workshops.colStart")}</th>
                    <th className="p-4">{t("adminx.workshops.colBooked")}</th>
                    <th className="p-4">{t("adminx.routes.colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {items.map((w) => (
                    <tr key={w.id}>
                      <td className="p-4 font-bold text-[#111111]">{w.title}</td>
                      <td className="p-4 text-[#555555]">{w.businessName}</td>
                      <td className="p-4">{f.dateTime(w.startTime)}</td>
                      <td className="p-4">{w.bookedCount} / {w.capacity}</td>
                      <td className="p-4">{w.status}</td>
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
