"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;
const REJECT_REASON = "Afgewezen door beheerder";

export default function AdminPayoutsPage() {
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-payouts-${offset}`, () =>
    adminApi.getPayouts({ limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const payouts = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Uitbetalingen Goedkeuren (Payouts)</h1>
          <p className="text-xs text-[#B7B7B7]">Beoordeel en keur verzochte uitbetalingen van winkeliers goed</p>
        </div>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || payouts.length === 0 ? (
          <EmptyState title="Geen uitbetalingen gevonden" description="Er zijn nog geen uitbetalingsverzoeken." />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Winkel</th>
                    <th className="p-4">IBAN</th>
                    <th className="p-4">Bedrag</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Datum</th>
                    <th className="p-4 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-4 font-mono font-bold">{p.id.slice(0, 8)}</td>
                      <td className="p-4 font-bold text-[#111111]">{p.businessName}</td>
                      <td className="p-4 font-mono text-[#555555]">{p.iban}</td>
                      <td className="p-4 font-extrabold text-[#111111]">{formatCurrency(p.amount)}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            p.status === "PAID" || p.status === "APPROVED"
                              ? "completed"
                              : p.status === "PENDING"
                                ? "processing"
                                : "cancelled"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-[#B7B7B7]">{formatDate(p.createdAt)}</td>
                      <td className="p-4 text-right">
                        {p.status === "PENDING" && (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={action.busyId === p.id}
                              disabled={action.busyId !== null}
                              onClick={() => action.run(p.id, () => adminApi.approvePayout(p.id))}
                              className="h-7 text-[11px] bg-[#3B9B52] hover:bg-[#2F7E42]"
                            >
                              Keur Goed & Betaal
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={action.busyId !== null}
                              onClick={() => action.run(p.id, () => adminApi.rejectPayout(p.id, REJECT_REASON))}
                              className="h-7 text-[11px] text-[#ED4C5C]"
                            >
                              Afwijzen
                            </Button>
                          </div>
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
