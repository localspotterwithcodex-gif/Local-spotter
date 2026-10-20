"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import type { Business, BusinessFulfilment } from "@/types/business";

const DEFAULTS: BusinessFulfilment = {
  pickupEnabled: true,
  shippingEnabled: true,
  localDeliveryEnabled: false,
  shippingFee: null,
  freeShippingThreshold: null,
  localDeliveryFee: 0,
  localDeliveryRadiusKm: null,
};

function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-sm font-bold text-[#111111] cursor-pointer">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-[#FA1EFF]" />
      {label}
    </label>
  );
}

const toText = (n: number | null): string => (n === null ? "" : String(n));

/** Empty = null; otherwise a non-negative number with at most 2 decimals. */
function parseMoney(text: string): number | null | "invalid" {
  const v = text.trim().replace(",", ".");
  if (v === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "invalid";
  return Number(v);
}

function FulfilmentForm({ business, onSaved }: { business: Business; onSaved: () => void }) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const initial = business.fulfilment ?? DEFAULTS;

  const [pickup, setPickup] = useState(initial.pickupEnabled);
  const [shipping, setShipping] = useState(initial.shippingEnabled);
  const [local, setLocal] = useState(initial.localDeliveryEnabled);
  const [shippingFee, setShippingFee] = useState(toText(initial.shippingFee));
  const [freeAbove, setFreeAbove] = useState(toText(initial.freeShippingThreshold));
  const [localFee, setLocalFee] = useState(String(initial.localDeliveryFee));
  const [radius, setRadius] = useState(toText(initial.localDeliveryRadiusKm));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!pickup && !shipping && !local) {
      setError(t("fulfilmentSettings.needOne"));
      return;
    }
    const fee = parseMoney(shippingFee);
    const free = parseMoney(freeAbove);
    const lFee = parseMoney(localFee);
    const rad = parseMoney(radius);
    if (fee === "invalid" || free === "invalid" || lFee === "invalid" || rad === "invalid") {
      setError(t("fulfilmentSettings.invalidNumber"));
      return;
    }
    if (rad !== null && (rad < 0.5 || rad > 200)) {
      setError(t("fulfilmentSettings.invalidRadius"));
      return;
    }
    setBusy(true);
    try {
      await api.updateBusiness(business.id, {
        pickupEnabled: pickup,
        shippingEnabled: shipping,
        localDeliveryEnabled: local,
        shippingFee: fee,
        freeShippingThreshold: free,
        localDeliveryFee: lFee ?? 0,
        localDeliveryRadiusKm: rad,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
        <Toggle id="ff-pickup" checked={pickup} onChange={setPickup} label={t("checkout.fulfilment.PICKUP")} />
        <p className="text-[11px] text-[#B7B7B7]">{t("fulfilmentSettings.pickupHelp")}</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
        <Toggle id="ff-ship" checked={shipping} onChange={setShipping} label={t("checkout.fulfilment.SHIPPING")} />
        {shipping && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t("fulfilmentSettings.shippingFee")} inputMode="decimal" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} placeholder={t("fulfilmentSettings.platformDefault")} />
            <Input label={t("fulfilmentSettings.freeAbove")} inputMode="decimal" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} placeholder={t("fulfilmentSettings.never")} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
        <Toggle id="ff-local" checked={local} onChange={setLocal} label={t("checkout.fulfilment.LOCAL_DELIVERY")} />
        {local && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t("fulfilmentSettings.localFee")} inputMode="decimal" value={localFee} onChange={(e) => setLocalFee(e.target.value)} />
              <Input label={t("fulfilmentSettings.radius")} inputMode="decimal" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder={t("fulfilmentSettings.sameTown")} />
            </div>
            <p className="text-[11px] text-[#B7B7B7]">{t("fulfilmentSettings.radiusHelp")}</p>
          </>
        )}
      </div>

      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {saved && <p role="status" className="text-xs text-[#3B9B52]">{t("fulfilmentSettings.saved")}</p>}
      <Button type="submit" variant="primary" isLoading={busy}>{t("fulfilmentSettings.save")}</Button>
    </form>
  );
}

export default function FulfilmentSettingsPage() {
  const { t } = useLocale();
  const { business, loading, error, reload } = useMyBusiness();

  if (loading) return <OwnerLayout><LoadingState /></OwnerLayout>;
  if (error) return <OwnerLayout><ErrorState message={error} onRetry={reload} /></OwnerLayout>;
  if (!business) return <OwnerLayout><EmptyState title={t("ownerx.noShop.title")} description="" /></OwnerLayout>;

  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <Link href="/owner/settings" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" /> {t("manage.nav.settings")}
        </Link>
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("fulfilmentSettings.title")}</h1>
        <p className="text-xs text-[#555555]">{t("fulfilmentSettings.intro")}</p>
        <FulfilmentForm business={business} onSaved={reload} />
      </div>
    </OwnerLayout>
  );
}
