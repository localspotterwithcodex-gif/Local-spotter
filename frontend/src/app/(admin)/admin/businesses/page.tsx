"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EditIconButton } from "@/components/ui/EditIconButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type BusinessStatus } from "@/lib/api/admin";
import { api } from "@/lib/api";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminBusinessesPage() {
  const { t, label } = useLocale();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [plan, setPlan] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const categories = useApiResource("admin-biz-categories", () => api.getBusinessCategories());
  const { data, error, loading, reload } = useApiResource(`admin-businesses-${query}-${status}-${categoryId}-${plan}-${offset}`, () =>
    adminApi.getBusinesses({ search: query, status: (status || undefined) as BusinessStatus | undefined, categoryId: categoryId || undefined, plan: plan || undefined, limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const businesses = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.businessesApproval")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.biz.subtitle")}</p>
          </div>
        </div>

        <AdminFilters
          search={{ value: search, onChange: setSearch, placeholder: t("adminx.biz.searchPlaceholder") }}
          selects={[
            { key: "status", label: t("common.status"), value: status, onChange: (v) => { setStatus(v); setOffset(0); }, options: (["PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "DRAFT", "DISABLED"] as const).map((v) => ({ value: v, label: label("status", v) })) },
            { key: "category", label: t("common.category"), value: categoryId, onChange: (v) => { setCategoryId(v); setOffset(0); }, options: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
            { key: "plan", label: t("adminx.filters.plan"), value: plan, onChange: (v) => { setPlan(v); setOffset(0); }, options: [{ value: "WEBSHOP", label: "Webshop" }, { value: "SHOPROUTES", label: "Shoproutes" }, { value: "WORKSHOP", label: "Workshop" }] },
          ]}
          onReset={() => { setSearch(""); setQuery(""); setStatus(""); setCategoryId(""); setPlan(""); setOffset(0); }}
        />

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || businesses.length === 0 ? (
          <EmptyState title={t("adminx.biz.emptyTitle")} description={t("adminx.biz.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-3">{t("adminx.biz.colName")}</th>
                    <th className="p-3">{t("common.category")}</th>
                    <th className="p-3">{t("adminx.biz.colKvk")}</th>
                    <th className="p-3">{t("adminx.biz.colCity")}</th>
                    <th className="p-3">{t("adminx.biz.colPlan")}</th>
                    <th className="p-3">{t("common.status")}</th>
                    <th className="p-3 text-right">{t("adminx.biz.colAction")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={b.logoUrl} name={b.name} shape="square" />
                          <div>
                            <div className="font-bold text-[#111111]">{b.name}</div>
                            {b.ownerName && <div className="text-[11px] text-[#B7B7B7]">{b.ownerName}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-[#555555]">{b.category}</td>
                      <td className="p-3 font-mono text-[#111111]">{b.kvkNumber}</td>
                      <td className="p-3 text-[#555555]">{b.city}</td>
                      <td className="p-3">
                        <span className="bg-[#FAE2F0] text-[#FA1EFF] font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {b.planName}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={b.status === "ACTIVE" ? "completed" : "processing"}>{label("status", b.status)}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                        <EditIconButton
                          title={b.name}
                          fields={[
                            { key: "name", label: t("common.name"), value: b.name },
                            { key: "city", label: t("manage.edit.city"), value: b.city },
                            { key: "kvkNumber", label: t("manage.edit.kvk"), value: b.kvkNumber },
                            { key: "description", label: t("common.description"), value: "", type: "textarea" },
                          ]}
                          onSave={async (c) => {
                            await adminApi.updateBusinessDetails(b.id, c);
                            reload();
                          }}
                        />
                        {b.status !== "ACTIVE" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={action.busyId === b.id}
                            disabled={action.busyId !== null}
                            onClick={() => action.run(b.id, () => adminApi.setBusinessStatus(b.id, "ACTIVE"))}
                            className="h-7 text-[11px]"
                          >
                            {t("adminx.biz.approve")}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-[#3B9B52] font-bold">{t("adminx.biz.approved")}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              isLoading={action.busyId === b.id}
                              disabled={action.busyId !== null}
                              onClick={() => action.run(b.id, () => adminApi.setBusinessStatus(b.id, "SUSPENDED"))}
                              className="h-7 text-[11px] text-[#ED4C5C]"
                            >
                              {t("adminx.biz.suspend")}
                            </Button>
                          </div>
                        )}
                        </div>
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
