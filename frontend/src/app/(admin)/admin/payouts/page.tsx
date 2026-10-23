"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type AdminPayout, type PayoutStatus } from "@/lib/api/admin";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

type Panel = { id: string; mode: "paid" | "reject" | "fail" } | null;

export default function AdminPayoutsPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-payouts-${status}-${offset}`, () =>
    adminApi.getPayouts({ status: (status || undefined) as PayoutStatus | undefined, limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const payouts = data?.items ?? [];
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState("");
  const [toolBusy, setToolBusy] = useState(false);
  const [toolError, setToolError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const closePanel = () => {
    setPanel(null);
    setText("");
  };

  const confirm = (p: AdminPayout) => {
    if (!panel || text.trim().length === 0) return;
    const value = text.trim();
    const task =
      panel.mode === "paid"
        ? () => adminApi.markPayoutPaid(p.id, value)
        : () => adminApi.rejectPayout(p.id, value, panel.mode === "fail" ? "FAILED" : "REJECTED");
    void action.run(p.id, task).then(closePanel);
  };

  const runNow = async () => {
    setToolBusy(true);
    setToolError(undefined);
    setNotice(undefined);
    try {
      const r = await adminApi.runPayouts();
      setNotice(t("adminx.payouts.runResult", { week: r.periodKey, created: r.created, existing: r.alreadyExists, below: r.belowMinimum, failed: r.failed }));
      reload();
    } catch (err) {
      setToolError(errMsg(err));
    } finally {
      setToolBusy(false);
    }
  };

  const exportCsv = async () => {
    setToolBusy(true);
    setToolError(undefined);
    setNotice(undefined);
    try {
      const csv = await adminApi.exportPayoutsCsv();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(t("adminx.payouts.exported"));
    } catch (err) {
      setToolError(errMsg(err));
    } finally {
      setToolBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA] flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.payoutsApproval")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.payouts.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" isLoading={toolBusy} disabled={toolBusy} onClick={() => void runNow()}>
              {t("adminx.payouts.runNow")}
            </Button>
            <Button variant="primary" size="sm" isLoading={toolBusy} disabled={toolBusy} onClick={() => void exportCsv()}>
              {t("adminx.payouts.export")}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-[#B7B7B7]">{t("adminx.payouts.manualNote")}</p>
        <AdminFilters
          selects={[{ key: "status", label: t("common.status"), value: status, onChange: (v) => { setStatus(v); setOffset(0); }, options: (["PENDING", "APPROVED", "PAID", "REJECTED", "FAILED"] as const).map((v) => ({ value: v, label: label("status", v) })) }]}
          onReset={() => { setStatus(""); setOffset(0); }}
        />

        <ActionError message={action.error ?? toolError} />
        {notice && <p role="status" className="text-xs text-[#3B9B52] font-bold">{notice}</p>}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || payouts.length === 0 ? (
          <EmptyState title={t("adminx.payouts.emptyTitle")} description={t("adminx.payouts.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">{t("adminx.payouts.colShop")}</th>
                    <th className="p-4">{t("adminx.payouts.colWeek")}</th>
                    <th className="p-4">{t("adminx.payouts.colAmount")}</th>
                    <th className="p-4">{t("common.status")}</th>
                    <th className="p-4">{t("common.date")}</th>
                    <th className="p-4 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {payouts.map((p) => {
                    const open = p.status === "PENDING" || p.status === "APPROVED";
                    const busy = action.busyId === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="hover:bg-[#F9F9F9]/50 transition-colors">
                          <td className="p-4 font-mono font-bold">{p.id.slice(0, 8)}</td>
                          <td className="p-4 font-bold text-[#111111]">
                            {p.businessName}
                            <span className="block text-[11px] font-normal text-[#B7B7B7]">{p.accountHolder}</span>
                          </td>
                          <td className="p-4 text-[#555555]">{p.periodKey ?? "-"}</td>
                          <td className="p-4 font-extrabold text-[#111111]">{f.currency(p.amount)}</td>
                          <td className="p-4">
                            <Badge variant={p.status === "PAID" || p.status === "APPROVED" ? "completed" : p.status === "PENDING" ? "processing" : "cancelled"}>
                              {label("status", p.status)}
                            </Badge>
                            {p.providerReference && <span className="block text-[11px] text-[#B7B7B7] mt-1">{p.providerReference}</span>}
                          </td>
                          <td className="p-4 text-[#B7B7B7]">{f.date(p.createdAt)}</td>
                          <td className="p-4 text-right">
                            {open && (
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {p.status === "PENDING" && (
                                  <Button variant="outline" size="sm" isLoading={busy} disabled={action.busyId !== null} onClick={() => action.run(p.id, () => adminApi.approvePayout(p.id))} className="h-7 text-[11px]">
                                    {t("adminx.payouts.approve")}
                                  </Button>
                                )}
                                <Button variant="primary" size="sm" disabled={action.busyId !== null} onClick={() => { setPanel({ id: p.id, mode: "paid" }); setText(""); }} className="h-7 text-[11px] bg-[#3B9B52] hover:bg-[#2F7E42]">
                                  {t("adminx.payouts.markPaid")}
                                </Button>
                                <Button variant="ghost" size="sm" disabled={action.busyId !== null} onClick={() => { setPanel({ id: p.id, mode: p.status === "APPROVED" ? "fail" : "reject" }); setText(""); }} className="h-7 text-[11px] text-[#ED4C5C]">
                                  {p.status === "APPROVED" ? t("adminx.payouts.fail") : t("adminx.payouts.reject")}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {panel?.id === p.id && (
                          <tr className="bg-[#F9F9F9]">
                            <td colSpan={7} className="p-4">
                              <div className="flex flex-wrap items-end gap-2">
                                <label className="flex-1 min-w-[220px] text-[11px] font-bold text-[#555555]">
                                  {panel.mode === "paid" ? t("adminx.payouts.referenceLabel") : t("adminx.payouts.reasonLabel")}
                                  <input
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    maxLength={panel.mode === "paid" ? 100 : 300}
                                    className="mt-1 w-full h-9 rounded-lg bg-white border border-[#EAEAEA] px-3 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                                  />
                                </label>
                                <Button variant="outline" size="sm" onClick={closePanel}>
                                  {t("common.cancel")}
                                </Button>
                                <Button variant="primary" size="sm" isLoading={busy} disabled={text.trim().length < (panel.mode === "paid" ? 1 : 3) || action.busyId !== null} onClick={() => confirm(p)}>
                                  {t("common.confirm")}
                                </Button>
                              </div>
                              {panel.mode !== "paid" && <p className="text-[11px] text-[#B7B7B7] mt-2">{t("adminx.payouts.reverseNote")}</p>}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
