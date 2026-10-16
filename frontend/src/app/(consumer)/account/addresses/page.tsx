"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api, type ConsumerAddress } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { joinStreet, splitStreet } from "@/lib/address";

interface FormState {
  id: string | null;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = { id: null, label: "", fullName: "", phone: "", street: "", postalCode: "", city: "", isDefault: false };

export default function AddressesPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { data, error, loading, reload } = useApiResource("consumer-addresses", () => api.getAddresses());
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      reload();
      return true;
    } catch (err) {
      setActionError(errMsg(err));
      return false;
    }
  };

  const openEdit = (a: ConsumerAddress) =>
    setForm({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone ?? "",
      street: joinStreet(a.street, a.houseNumber),
      postalCode: a.postalCode ?? "",
      city: a.city,
      isDefault: a.isDefault,
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const { street, houseNumber } = splitStreet(form.street);
    const payload = {
      label: form.label.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || undefined,
      street,
      houseNumber,
      postalCode: form.postalCode.trim() || undefined,
      city: form.city.trim(),
      isDefault: form.isDefault,
    };
    const ok = await run(() => (form.id ? api.updateAddress(form.id, payload) : api.createAddress(payload)));
    setSaving(false);
    if (ok) setForm(null);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/account" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("account.deliveryAddress")}</h1>
            {!form && data && (
              <Button size="sm" variant="primary" className="gap-1.5" onClick={() => setForm({ ...EMPTY_FORM, isDefault: data.length === 0 })}>
                <Plus className="w-4 h-4" /> {t("account.addr.add")}
              </Button>
            )}
          </div>

          {actionError && (
            <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
              {actionError}
            </div>
          )}

          {form && (
            <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-md space-y-4">
              <h2 className="text-base font-bold font-rubik text-[#111111]">{form.id ? t("account.addr.edit") : t("account.addr.new")}</h2>
              <Input label={t("account.addr.label")} placeholder={t("account.addr.labelPh")} value={form.label} onChange={(e) => set({ label: e.target.value })} required maxLength={40} />
              <Input label={t("account.fullName")} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required minLength={2} maxLength={100} />
              <Input label={t("checkout.phone")} value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" />
              <Input label={t("checkout.street")} value={form.street} onChange={(e) => set({ street: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("checkout.postalCode")} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} maxLength={12} />
                <Input label={t("checkout.city")} value={form.city} onChange={(e) => set({ city: e.target.value })} required />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#111111]">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} className="accent-[#FA1EFF]" />
                {t("account.addr.makeDefault")}
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="outline" fullWidth onClick={() => setForm(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" fullWidth isLoading={saving}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <LoadingState label={t("account.addr.loading")} />
          ) : error || !data ? (
            <ErrorState title={t("account.addr.unavailable")} message={error} onRetry={reload} />
          ) : data.length === 0 && !form ? (
            <EmptyState title={t("account.addressesEmptyTitle")} description={t("account.addressesEmptyDesc")} />
          ) : (
            <ul className="space-y-3">
              {data.map((a) => (
                <li key={a.id} className="bg-white p-4 rounded-2xl border border-[#EAEAEA] shadow-2xs flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#FA1EFF] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 text-sm text-[#111111]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{a.label}</span>
                      {a.isDefault && (
                        <span className="text-[10px] font-bold bg-[#FAE2F0] text-[#FA1EFF] rounded-full px-2 py-0.5">{t("account.addr.default")}</span>
                      )}
                    </div>
                    <p>{a.fullName}</p>
                    <p className="text-[#555555]">{joinStreet(a.street, a.houseNumber)}</p>
                    <p className="text-[#555555]">{[a.postalCode, a.city].filter(Boolean).join(" ")}</p>
                    {a.phone && <p className="text-[#555555]">{a.phone}</p>}
                    {!a.isDefault && (
                      <button type="button" className="mt-1 text-xs font-bold text-[#FA1EFF] hover:underline" onClick={() => run(() => api.updateAddress(a.id, { isDefault: true }))}>
                        {t("account.addr.setDefault")}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" aria-label={t("account.addr.editAria", { label: a.label })} className="p-2 text-[#B7B7B7] hover:text-[#111111]" onClick={() => openEdit(a)}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("account.addr.deleteAria", { label: a.label })}
                      className="p-2 text-[#B7B7B7] hover:text-[#ED4C5C]"
                      onClick={() => {
                        if (window.confirm(t("account.addr.deleteConfirm"))) void run(() => api.deleteAddress(a.id));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ConsumerLayout>
  );
}
