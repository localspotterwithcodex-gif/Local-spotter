"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";
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
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-orders-${offset}`, () =>
    adminApi.getOrders({ limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const orders = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Bestellingen Overzicht</h1>
          <p className="text-xs text-[#B7B7B7]">Centraal overzicht van alle transacties op het platform</p>
        </div>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || orders.length === 0 ? (
          <EmptyState title="Geen bestellingen gevonden" description="Er zijn nog geen bestellingen geplaatst." />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">Order Nr.</th>
                    <th className="p-4">Klant</th>
                    <th className="p-4">Winkel</th>
                    <th className="p-4">Totaal</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-4 font-bold text-[#111111]">{o.orderNumber}</td>
                      <td className="p-4 text-[#555555]">{o.consumerName}</td>
                      <td className="p-4 font-bold text-[#111111]">{o.businessName}</td>
                      <td className="p-4 font-bold">{formatCurrency(o.total)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge status={o.status} />
                          <select
                            aria-label={`Status wijzigen voor ${o.orderNumber}`}
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
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-4 text-[#B7B7B7]">{formatDate(o.createdAt)}</td>
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
