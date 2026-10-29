"use client";

import React, { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface EditField {
  key: string;
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "number" | "textarea";
}

interface Props {
  title: string;
  fields: EditField[];
  /** Receives only the fields the user changed (numbers already converted). Throw to keep the dialog open. */
  onSave: (changes: Record<string, string | number>) => Promise<unknown>;
  className?: string;
}

/** Pencil icon that opens a small edit dialog. Shared by the owner and admin lists so every tab edits the same way. */
export function EditIconButton({ title, fields, onSave, className }: Props) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value == null ? "" : String(f.value)])));
    setError(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const changes: Record<string, string | number> = {};
    for (const f of fields) {
      const next = (values[f.key] ?? "").trim();
      const prev = f.value == null ? "" : String(f.value);
      if (next === prev) continue;
      if (f.type === "number") {
        const n = Number(next);
        if (next === "" || Number.isNaN(n)) return setError(t("ownerx.error.requiredFields"));
        changes[f.key] = n;
      } else {
        changes[f.key] = next;
      }
    }
    if (Object.keys(changes).length === 0) return setOpen(false);
    setBusy(true);
    setError(null);
    try {
      await onSave(changes);
      setOpen(false);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        title={t("common.edit")}
        aria-label={`${t("common.edit")}: ${title}`}
        className={className ?? "p-1.5 text-[#FA1EFF] hover:bg-[#FAE2F0] rounded-lg transition-colors"}
      >
        <Pencil className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
          <form onSubmit={save} className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl space-y-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold font-rubik text-[#111111] truncate">{title}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="text-[#B7B7B7] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {fields.map((f) =>
              f.type === "textarea" ? (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-bold text-[#111111]">{f.label}</label>
                  <textarea
                    rows={4}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full bg-[#EAEAEA] text-[#111111] text-sm p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white"
                  />
                </div>
              ) : (
                <Input
                  key={f.key}
                  label={f.label}
                  type={f.type === "number" ? "number" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ),
            )}
            {error && <p role="alert" className="text-xs font-bold text-[#E54666]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" fullWidth disabled={busy} onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button variant="primary" fullWidth type="submit" isLoading={busy}>{t("common.save")}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
