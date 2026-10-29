"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { cn } from "@/lib/utils";

interface DeleteButtonProps {
  /** Runs after the user confirms. Throwing keeps the item and shows the (translated) error. */
  onConfirm: () => Promise<unknown>;
  /** Text of the trigger button; defaults to "Delete". */
  label?: string;
  /** Question shown while confirming. */
  confirmText?: string;
  className?: string;
}

/** Small delete control with an inline "Are you sure?" step, so nothing is removed by one accidental tap. */
export function DeleteButton({ onConfirm, label, confirmText, className }: DeleteButtonProps) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setConfirming(false);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={cn("inline-flex items-center gap-1.5 rounded-xl border border-[#ED4C5C]/40 px-3 py-1.5 text-xs font-bold text-[#ED4C5C] hover:bg-[#F2D9DE]/50", className)}
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        {label ?? t("common.delete")}
      </button>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2 text-xs", className)} role="group">
      <span className="font-bold text-[#555555]">{confirmText ?? t("manage.del.confirm")}</span>
      <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-xl border border-[#EAEAEA] px-3 py-1.5 font-bold text-[#555555] hover:bg-[#F9F9F9] disabled:opacity-50">
        {t("common.cancel")}
      </button>
      <button type="button" disabled={busy} onClick={() => void run()} className="rounded-xl bg-[#ED4C5C] px-3 py-1.5 font-bold text-white hover:bg-[#D93B4B] disabled:opacity-50">
        {busy ? "…" : t("common.delete")}
      </button>
      {error && <span role="alert" className="w-full text-[#E54666] font-bold">{error}</span>}
    </span>
  );
}
