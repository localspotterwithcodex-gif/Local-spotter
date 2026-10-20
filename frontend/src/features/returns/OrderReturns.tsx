"use client";

import React, { useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api, type ReturnRequest } from "@/lib/api";
import { PAID_STATES, type Order } from "@/types/order";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { ReturnStatusBadge } from "./ReturnStatusBadge";

/** Statuses that still reserve quantity (mirrors QUANTITY_HOLDING_STATUSES on the server). */
const HOLDING = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED"];

/** Return requests of one delivered order, plus the form to start a new one. */
export function OrderReturns({ order, returns, onChanged }: { order: Order; returns: ReturnRequest[]; onChanged: () => void }) {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const left = useMemo(() => {
    const held = new Map<string, number>();
    for (const r of returns) {
      if (!HOLDING.includes(r.status)) continue;
      for (const i of r.items) held.set(i.orderItemId, (held.get(i.orderItemId) ?? 0) + i.quantity);
    }
    return order.items.map((i) => ({ item: i, left: Math.max(0, i.quantity - (held.get(i.id) ?? 0)) }));
  }, [order.items, returns]);

  const eligible = order.status === "DELIVERED" && PAID_STATES.includes(order.paymentStatus);
  if (!eligible && returns.length === 0) return null;

  const anyLeft = left.some((l) => l.left > 0);
  const chosen = Object.entries(picked).filter(([, q]) => q > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (chosen.length === 0) return setError(t("returns.pickOne"));
    if (reason.trim().length < 5) return setError(t("returns.reasonRequired"));
    setBusy(true);
    try {
      await api.createReturn({ orderId: order.id, reason: reason.trim(), items: chosen.map(([orderItemId, quantity]) => ({ orderItemId, quantity })) });
      setOpen(false);
      setPicked({});
      setReason("");
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await api.cancelReturn(id);
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-3 border-t border-[#F9F9F9] space-y-3">
      {returns.map((r) => (
        <div key={r.id} className="bg-[#F9F9F9] rounded-2xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#111111]">{r.returnNumber}</span>
            <ReturnStatusBadge status={r.status} />
          </div>
          <p className="text-[#555555]">{r.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p>
          {r.merchantNote && (
            <p className="text-[#555555]">
              <span className="font-bold">{t("returns.noteFromShop")}</span> {r.merchantNote}
            </p>
          )}
          {r.status === "APPROVED" && <p className="text-[#3B9B52]">{t("returns.sendBack")}</p>}
          {r.status === "REFUNDED" && r.refundAmountCents !== null && (
            <p className="text-[#3B9B52] font-bold">{t("returns.refundedAmount", { amount: f.currency(r.refundAmountCents / 100) })}</p>
          )}
          {r.status === "RECEIVED" && <p className="text-[#555555]">{r.refundStatus === "FAILED" ? t("returns.refundManual") : t("returns.refundPending")}</p>}
          {r.status === "REQUESTED" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void cancel(r.id)}>
                {t("returns.withdraw")}
              </Button>
            </div>
          )}
        </div>
      ))}

      {eligible && anyLeft && !open && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Undo2 className="w-3.5 h-3.5" /> {t("returns.request")}
        </Button>
      )}

      {open && (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs font-bold text-[#111111]">{t("returns.requestTitle")}</p>
          <ul className="space-y-2">
            {left
              .filter((l) => l.left > 0)
              .map(({ item, left: max }) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#555555] min-w-0 truncate">{item.productName}</span>
                  <select
                    aria-label={t("returns.qtyFor", { name: item.productName })}
                    value={picked[item.id] ?? 0}
                    onChange={(e) => setPicked((p) => ({ ...p, [item.id]: Number(e.target.value) }))}
                    className="h-9 rounded-lg bg-[#EAEAEA] px-2 text-xs"
                  >
                    {Array.from({ length: max + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
          </ul>
          <label className="block text-xs font-medium text-[#B7B7B7]" htmlFor={`ret-reason-${order.id}`}>
            {t("returns.reason")}
          </label>
          <textarea
            id={`ret-reason-${order.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t("returns.reasonPlaceholder")}
            className="w-full rounded-lg bg-[#EAEAEA] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={busy}>
              {t("returns.submit")}
            </Button>
          </div>
        </form>
      )}
      {!open && error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
