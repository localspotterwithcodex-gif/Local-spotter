"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { Button } from "@/components/ui/Button";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { adminApi, type AdminPlanCommission } from "@/lib/api/admin";

interface Props {
  plan: AdminPlanCommission;
  /** Text currently shown for the description (translation or admin-edited). */
  descriptionText: string;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_PRICE = 10000;

/** Edit form for one subscription plan. The server validates again; this only saves a round trip. */
export function PlanEditModal({ plan, descriptionText, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(descriptionText);
  const [price, setPrice] = useState(String(plan.monthlyPrice));
  const [active, setActive] = useState(plan.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const priceNumber = Number(price.replace(",", "."));
  const priceValid = price.trim() !== "" && Number.isFinite(priceNumber) && priceNumber >= 0 && priceNumber <= MAX_PRICE && Math.round(priceNumber * 100) / 100 === priceNumber;
  const valid = name.trim().length > 0 && name.trim().length <= 60 && description.length <= 500 && priceValid;

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await adminApi.updatePlan(plan.id, { name: name.trim(), description: description.trim(), monthlyPrice: priceNumber, active });
      onSaved();
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  const field = "h-10 w-full rounded-xl border border-transparent bg-[#EAEAEA] px-3 text-sm text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="plan-edit-title">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
          <h2 id="plan-edit-title" className="font-rubik text-lg font-bold text-[#111111]">{t("adminx.subs.editTitle", { name: plan.name })}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("common.close")} className="rounded-full p-1.5 text-[#6B6B6B] hover:bg-[#F9F9F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#111111]">{t("adminx.subs.fieldName")}</span>
            <input ref={firstField} className={field} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#111111]">{t("adminx.subs.fieldPrice")}</span>
            <input className={field} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!priceValid} />
            {!priceValid && <span className="mt-1 block text-[11px] text-[#ED4C5C]">{t("adminx.subs.priceInvalid", { max: MAX_PRICE })}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-[#111111]">{t("adminx.subs.fieldDescription")}</span>
            <textarea className={`${field} h-24 py-2`} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#111111]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#FA1EFF]" />
            {t("adminx.subs.fieldActive")}
          </label>
          <p className="rounded-xl bg-[#FAE2F0] p-3 text-[11px] text-[#790166]">{t("adminx.subs.priceNote")}</p>
          {error && <p role="alert" className="text-xs font-bold text-[#ED4C5C]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={save} isLoading={busy} disabled={!valid}>{t("common.save")}</Button>
        </div>
      </div>
    </div>
  );
}
