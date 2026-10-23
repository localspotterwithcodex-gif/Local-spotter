"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import type { OrderStatus } from "@/types/order";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;
const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
];
const ADMIN_REASON = "Beheerderscorrectie via platformbeheer";

export default function AdminOrdersPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, error, loading, reload } = useApiResource(`admin-orders-${query}-${status}-${offset}`, () =>
    adminApi.getOrders({ search: query, status: (status || undefined) as OrderStatus | undefined, limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const orders = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.ordersOverview")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.orders.subtitle")}</p>
        </div>

        <AdminFilters
          search={{ value: search, onChange: setSearch, placeholder: t("adminx.orders.searchPlaceholder") }}
          selects={[{ key: "status", label: t("common.status"), value: status, onChange: (v) => { setStatus(v); setOffset(0); }, options: ORDER_STATUSES.map((v) => ({ value: v, label: label("status", v) })) }]}
          onReset={() => { setSearch(""); setQuery(""); setStatus(""); setOffset(0); }}
        />

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || orders.length === 0 ? (
          <EmptyState title={t("adminx.orders.emptyTitle")} description={t("adminx.orders.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">{t("adminx.orders.colNumber")}</th>
                    <th className="p-4">{t("adminx.orders.colCustomer")}</th>
                    <th className="p-4">{t("adminx.orders.colShop")}</th>
                    <th className="p-4">{t("common.total")}</th>
                    <th className="p-4">{t("common.status")}</th>
                    <th className="p-4">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-4 font-bold text-[#111111]">{o.orderNumber}</td>
                      <td className="p-4 text-[#555555]">{o.consumerName}</td>
                      <td className="p-4 font-bold text-[#111111]">{o.businessName}</td>
                      <td className="p-4 font-bold">{f.currency(o.total)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge status={o.status}>{label("status", o.status)}</Badge>
                          <select
                            aria-label={t("adminx.orders.changeStatusFor", { number: o.orderNumber })}
                            value={o.status}
                            disabled={action.busyId !== null}
                            onChange={(e) => {
                              const next = e.target.value as OrderStatus;
                              if (next !== o.status) {
                                action.run(o.id, () => adminApi.setOrderStatus(o.id, next, ADMIN_REASON));
                              }
                            }}
                            className="h-7 rounded-lg border border-[#EAEAEA] bg-white px-2 text-[11px] text-[#111111] disabled:opacity-50"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {label("status", s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-[#B7B7B7]">{f.date(o.createdAt)}</td>
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
