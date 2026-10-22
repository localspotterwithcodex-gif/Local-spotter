"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function OwnerProductsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const list = useApiResource(businessId ? `owner-products:${businessId}` : null, () => api.getBusinessProducts(businessId!));
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleActive = async (id: string, active: boolean) => {
    setError("");
    setBusyId(id);
    try {
      await api.setProductActive(id, active);
      list.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  if (businessLoading) return <OwnerLayout><LoadingState /></OwnerLayout>;
  if (businessError) return <OwnerLayout><ErrorState message={businessError} onRetry={reloadBusiness} /></OwnerLayout>;
  if (!business) return <OwnerLayout><EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forWorkshops")} /></OwnerLayout>;

  const products = list.data ?? [];
  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("ownerx.products.title")}</h1>
          <Link href="/owner/products/new">
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />{t("owner.addProduct")}</Button>
          </Link>
        </div>

        {error && <p role="alert" className="text-xs font-bold text-[#E54666]">{error}</p>}

        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : products.length === 0 ? (
          <EmptyState title={t("ownerx.products.emptyTitle")} description={t("ownerx.products.emptyDesc")} />
        ) : (
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-[#EAEAEA] bg-white p-3">
                <div className="flex shrink-0 gap-1" aria-label={p.images.length === 0 ? t("ownerx.products.noPhotos") : undefined}>
                  {p.images.length === 0 ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[#EAEAEA] text-[9px] text-[#B7B7B7]">
                      {t("ownerx.products.noPhotos")}
                    </span>
                  ) : (
                    p.images.slice(0, 3).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${src}-${i}`} src={src} alt={t("ownerx.products.thumbAlt", { name: p.name, n: i + 1 })} loading="lazy" className="h-10 w-10 rounded-lg border border-[#EAEAEA] object-cover" />
                    ))
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#111111]">{p.name}</p>
                  <p className="text-xs text-[#B7B7B7]">
                    {f.currency(p.price)} · {t("ownerx.products.stock", { n: p.stock })} · {p.isActive ? t("ownerx.products.active") : t("ownerx.products.hidden")}
                  </p>
                </div>
                <Link href={`/owner/products/${p.id}/edit`} className="text-xs font-bold text-[#FA1EFF]">
                  {t("common.edit")}
                </Link>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => toggleActive(p.id, !p.isActive)}
                  className="text-xs font-bold text-[#121F3E] disabled:opacity-50"
                >
                  {p.isActive ? t("ownerx.products.hide") : t("ownerx.products.show")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OwnerLayout>
  );
}
