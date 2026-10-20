"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, PackageCheck, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api, type ReturnRequest } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { ReturnStatusBadge } from "./ReturnStatusBadge";

/** Returns of one shop; used by the owner and by invited team members. */
export function ShopReturnsBoard({ businessId }: { businessId: string }) {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const res = useApiResource(`shop-returns:${businessId}`, () => api.getShopReturns(businessId));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState<Record<string, boolean>>({});

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError("");
    try {
      await action();
      setRejecting(null);
      setNote("");
      res.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  if (res.loading) return <LoadingState label={t("returns.shop.loading")} />;
  if (res.error) return <ErrorState message={res.error} onRetry={res.reload} />;
  const rows: ReturnRequest[] = res.data ?? [];
  if (rows.length === 0) return <EmptyState title={t("returns.shop.emptyTitle")} description={t("returns.shop.emptyDesc")} />;

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {rows.map((r) => (
        <div key={r.id} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F9F9F9]">
            <div>
              <p className="text-sm font-bold text-[#111111]">{r.returnNumber}</p>
              <p className="text-xs text-[#B7B7B7]">
                {f.date(r.requestedAt)} · {t("returns.shop.order", { number: r.orderNumber })} · {r.customerName}
              </p>
            </div>
            <ReturnStatusBadge status={r.status} />
          </div>

          <ul className="space-y-1 text-xs">
            {r.items.map((i) => (
              <li key={i.orderItemId} className="flex justify-between">
                <span className="text-[#111111]">
                  {i.quantity}x {i.name} {i.variant ? `(${i.variant})` : ""}
                </span>
                <span className="font-bold">{f.currency((i.unitPriceCents * i.quantity) / 100)}</span>
              </li>
            ))}
          </ul>
          <p className="p-3 bg-[#F9F9F9] rounded-2xl text-xs text-[#555555]">
            <span className="font-bold text-[#111111]">{t("returns.shop.reason")} </span>
            {r.reason}
          </p>
          {r.merchantNote && <p className="text-xs text-[#555555]">{r.merchantNote}</p>}

          {r.status === "REFUNDED" && r.refundAmountCents !== null && (
            <p className="text-xs font-bold text-[#3B9B52]">{t("returns.refundedAmount", { amount: f.currency(r.refundAmountCents / 100) })}</p>
          )}

          {r.status === "REQUESTED" &&
            (rejecting === r.id ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#B7B7B7]" htmlFor={`rej-${r.id}`}>
                  {t("returns.shop.rejectReason")}
                </label>
                <textarea
                  id={`rej-${r.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg bg-[#EAEAEA] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busyId !== null} onClick={() => setRejecting(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={busyId === r.id}
                    disabled={busyId !== null || note.trim().length === 0}
                    onClick={() => void run(r.id, () => api.decideReturn(r.id, "REJECT", note.trim()))}
                  >
                    {t("returns.shop.confirmReject")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={busyId !== null} onClick={() => setRejecting(r.id)}>
                  <XCircle className="w-3.5 h-3.5 mr-1" /> {t("returns.shop.reject")}
                </Button>
                <Button variant="primary" size="sm" isLoading={busyId === r.id} disabled={busyId !== null} onClick={() => void run(r.id, () => api.decideReturn(r.id, "APPROVE"))}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t("returns.shop.approve")}
                </Button>
              </div>
            ))}

          {r.status === "APPROVED" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={restock[r.id] ?? true}
                  onChange={(e) => setRestock((s) => ({ ...s, [r.id]: e.target.checked }))}
                  className="w-4 h-4 accent-[#FA1EFF]"
                />
                {t("returns.shop.restock")}
              </label>
              <Button
                variant="primary"
                size="sm"
                isLoading={busyId === r.id}
                disabled={busyId !== null}
                onClick={() => void run(r.id, () => api.receiveReturn(r.id, restock[r.id] ?? true))}
              >
                <PackageCheck className="w-3.5 h-3.5 mr-1" /> {t("returns.shop.received")}
              </Button>
            </div>
          )}

          {r.status === "RECEIVED" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#555555]">{r.refundStatus === "FAILED" ? t("returns.shop.refundFailed") : t("returns.refundPending")}</p>
              {r.refundStatus === "FAILED" && (
                <Button variant="primary" size="sm" isLoading={busyId === r.id} disabled={busyId !== null} onClick={() => void run(r.id, () => api.retryReturnRefund(r.id))}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("returns.shop.retry")}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
