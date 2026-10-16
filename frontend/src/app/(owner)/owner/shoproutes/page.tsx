"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useOwnerAccess } from "@/features/business/useOwnerAccess";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { validationDetail } from "@/lib/errors";

export default function OwnerShoproutesPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const access = useOwnerAccess(businessId);
  const allowed = access.can("shoproutes");

  const routes = useApiResource(allowed && businessId ? `owner-routes:${businessId}` : null, () => api.getBusinessShoproutes(businessId!));
  // Candidate stops: published shops whose plan includes Shop Routes (the backend enforces this too).
  const shops = useApiResource(allowed ? "route-stop-candidates" : null, () => api.getBusinesses({ limit: 100 }));

  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const hasCoords = (s: { location: { lat: number; lng: number } }) => s.location.lat !== 0 || s.location.lng !== 0;
  // Own shop first (even without a map location, so the owner sees why it can't be picked yet),
  // then other published shops on a plan that includes Shop Routes.
  const candidates = useMemo(() => {
    const others = (shops.data ?? []).filter((s) => s.id !== businessId && s.subscriptionTier && s.subscriptionTier !== "WEBSHOP" && hasCoords(s));
    return business ? [business, ...others] : others;
  }, [shops.data, business, businessId]);

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const routeCity = (city || business?.location.city || "").trim();
    if (!title.trim() || !routeCity) {
      setError(t("ownerx.error.requiredFields"));
      return;
    }
    if (selected.length === 0) {
      setError(t("ownerx.routes.noStops"));
      return;
    }
    const stops = selected.map((id, i) => {
      const shop = candidates.find((s) => s.id === id)!;
      return { businessId: id, title: shop.name, latitude: shop.location.lat, longitude: shop.location.lng, sequence: i };
    });
    setBusy(true);
    try {
      await api.createShoproute({ title: title.trim(), city: routeCity, description: description.trim() || undefined, publish, stops });
      setTitle("");
      setDescription("");
      setSelected([]);
      setNotice(t("ownerx.routes.created"));
      routes.reload();
    } catch (err) {
      const detail = validationDetail(err);
      setError(detail ? `${errMsg(err)} (${detail})` : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setNotice("");
    try {
      await fn();
      routes.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (businessLoading || access.loading) return <OwnerLayout><LoadingState /></OwnerLayout>;
  if (businessError) return <OwnerLayout><ErrorState message={businessError} onRetry={reloadBusiness} /></OwnerLayout>;
  if (!business) {
    return <OwnerLayout><EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forWorkshops")} /></OwnerLayout>;
  }
  if (!allowed) {
    return (
      <OwnerLayout>
        <div className="max-w-[640px] mx-auto space-y-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("ownerx.routes.title")}</h1>
          <div className="rounded-2xl bg-[#FFF6DB] border border-[#D4B011] p-4 text-sm text-[#121F3E] space-y-2">
            <p>{t("ownerx.routes.locked")}</p>
            <Link href="/owner/subscription" className="font-bold text-[#FA1EFF]">{t("ownerx.routes.upgrade")}</Link>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("ownerx.routes.title")}</h1>
          <Link href="/owner/shoproutes/location" className="text-xs font-bold text-[#FA1EFF] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {t("owner.shoppingRouteLocation")}
          </Link>
        </div>

        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {notice && <p role="status" className="text-xs text-[#1b8a83]">{notice}</p>}

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-[#EAEAEA] p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#121F3E]">{t("ownerx.routes.new")}</h2>
          <Input placeholder={t("ownerx.routes.titleLabel")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input placeholder={`${t("ownerx.routes.city")} (${business.location.city})`} value={city} onChange={(e) => setCity(e.target.value)} />
          <textarea
            className="w-full rounded-xl border border-[#EAEAEA] p-3 text-sm"
            rows={3}
            placeholder={t("ownerx.routes.desc")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-[#555555] mb-1">{t("ownerx.routes.stops")}</legend>
            {shops.loading ? (
              <p className="text-xs text-[#B7B7B7]">…</p>
            ) : candidates.length === 0 ? (
              <p className="text-xs text-[#B7B7B7]">{t("ownerx.routes.noCandidates")}</p>
            ) : (
              candidates.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-[#121F3E]">
                  <input type="checkbox" checked={selected.includes(s.id)} disabled={!hasCoords(s)} onChange={() => toggle(s.id)} />
                  <span className="font-bold">{s.name}</span>
                  <span className="text-[#B7B7B7]">{s.location.city}</span>
                  {!hasCoords(s) && (
                    <Link href="/owner/shoproutes/location" className="font-bold text-[#FA1EFF]">
                      {t("ownerx.routes.setLocation")}
                    </Link>
                  )}
                </label>
              ))
            )}
          </fieldset>
          <label className="flex items-center gap-2 text-xs text-[#121F3E]">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            {t("ownerx.routes.publish")}
          </label>
          <Button type="submit" isLoading={busy} disabled={busy} fullWidth>
            <Plus className="w-4 h-4 mr-1" /> {t("ownerx.routes.create")}
          </Button>
        </form>

        {routes.loading ? (
          <LoadingState />
        ) : routes.error ? (
          <ErrorState message={routes.error} onRetry={routes.reload} />
        ) : (routes.data ?? []).length === 0 ? (
          <EmptyState title={t("ownerx.routes.empty")} description="" />
        ) : (
          <ul className="space-y-3">
            {(routes.data ?? []).map((r) => (
              <li key={r.id} className="bg-white rounded-2xl border border-[#EAEAEA] p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#121F3E] truncate">{r.title}</p>
                  <p className="text-[11px] text-[#555555]">
                    {r.cityName} · {r.shopCount} {t("ownerx.routes.shops")} ·{" "}
                    <span className={r.status === "PUBLISHED" ? "text-[#1b8a83]" : "text-[#B7B7B7]"}>
                      {r.status === "PUBLISHED" ? t("ownerx.routes.published") : t("ownerx.routes.draft")}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.status === "PUBLISHED" && (
                    <Link href={`/shoproutes/${r.id}`} className="p-2 text-[#FA1EFF]" aria-label={t("ownerx.visible.view")}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    className="p-2 text-[#555555]"
                    aria-label={r.status === "PUBLISHED" ? t("ownerx.routes.unpublish") : t("ownerx.routes.publishBtn")}
                    onClick={() => run(() => api.setShoprouteStatus(r.id, r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"))}
                  >
                    {r.status === "PUBLISHED" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button type="button" className="p-2 text-red-600" aria-label={t("ownerx.routes.delete")} onClick={() => run(() => api.deleteShoproute(r.id))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OwnerLayout>
  );
}
