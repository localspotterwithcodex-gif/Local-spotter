"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, XCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
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

export default function OwnerWorkshopsPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const access = useOwnerAccess(businessId);
  const allowed = access.can("workshops");
  const list = useApiResource(allowed && businessId ? `owner-workshops:${businessId}` : null, () => api.getBusinessWorkshops(businessId!));
  const [error, setError] = useState("");

  const cancel = async (id: string) => {
    setError("");
    try {
      await api.cancelWorkshop(id);
      list.reload();
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
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("ownerx.workshops.title")}</h1>
          <div className="rounded-2xl bg-[#FFF6DB] border border-[#D4B011] p-4 text-sm text-[#121F3E] space-y-2">
            <p>{t("ownerx.workshops.locked")}</p>
            <Link href="/owner/subscription" className="font-bold text-[#FA1EFF]">{t("ownerx.routes.upgrade")}</Link>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("ownerx.workshops.title")}</h1>
          <Link href="/owner/workshops/new">
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> {t("ownerx.dash.workshopBtn")}</Button>
          </Link>
        </div>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {list.loading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title={t("ownerx.workshops.empty")} description="" />
        ) : (
          <ul className="space-y-3">
            {(list.data ?? []).map((w) => (
              <li key={w.id} className="bg-white rounded-2xl border border-[#EAEAEA] p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#121F3E] truncate">{w.title}</p>
                  <p className="text-[11px] text-[#555555]">
                    {w.date} · {w.startTime}–{w.finishTime} · {w.bookedCount}/{w.capacity}
                  </p>
                  <p className="text-[11px] text-[#B7B7B7]">{w.status}</p>
                </div>
                {w.status !== "CANCELLED" && w.status !== "COMPLETED" && (
                  <button type="button" className="p-2 text-red-600 shrink-0" aria-label={t("ownerx.workshops.cancel")} onClick={() => cancel(w.id)}>
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </OwnerLayout>
  );
}
