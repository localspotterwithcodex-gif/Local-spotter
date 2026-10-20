"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminRoutesPage() {
  const { t } = useLocale();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-routes-${offset}`, () => adminApi.getRoutes({ limit: PAGE_SIZE, offset }));
  const action = useAdminAction(reload);
  const routes = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.routesModeration")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.routes.subtitle")}</p>
        </div>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || routes.length === 0 ? (
          <EmptyState title={t("adminx.routes.emptyTitle")} description={t("adminx.routes.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">{t("adminx.routes.colRoute")}</th>
                    <th className="p-4">{t("adminx.routes.colShop")}</th>
                    <th className="p-4">{t("adminx.routes.colStops")}</th>
                    <th className="p-4">{t("adminx.routes.colStatus")}</th>
                    <th className="p-4 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td className="p-4 font-bold text-[#111111]">
                        {r.title}
                        <span className="block font-normal text-[#B7B7B7]">{r.city}</span>
                      </td>
                      <td className="p-4 text-[#555555]">{r.businessName}</td>
                      <td className="p-4">{r.stopCount}</td>
                      <td className="p-4">{r.status}</td>
                      <td className="p-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => action.run(r.id, () => adminApi.moderateRoute(r.id, { featured: !r.featured }))}
                          disabled={action.busyId !== null}
                          aria-pressed={r.featured}
                          className={`inline-flex items-center gap-1 font-bold disabled:opacity-50 ${r.featured ? "text-[#FA1EFF]" : "text-[#555555]"}`}
                        >
                          <Star className={`w-4 h-4 ${r.featured ? "fill-[#FA1EFF]" : ""}`} />
                          {r.featured ? t("adminx.routes.unfeature") : t("adminx.routes.feature")}
                        </button>
                        {r.status === "PUBLISHED" ? (
                          <button
                            onClick={() => action.run(r.id, () => adminApi.moderateRoute(r.id, { status: "ARCHIVED" }))}
                            disabled={action.busyId !== null}
                            className="font-bold text-[#ED4C5C] disabled:opacity-50"
                          >
                            {t("adminx.routes.archive")}
                          </button>
                        ) : (
                          <button
                            onClick={() => action.run(r.id, () => adminApi.moderateRoute(r.id, { status: "PUBLISHED" }))}
                            disabled={action.busyId !== null}
                            className="font-bold text-[#3B9B52] disabled:opacity-50"
                          >
                            {t("adminx.routes.publish")}
                          </button>
                        )}
                      </td>
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
