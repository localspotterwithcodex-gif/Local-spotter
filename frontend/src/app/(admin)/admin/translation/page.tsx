"use client";

import React from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";

export default function AdminTranslationPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading, reload } = useApiResource("admin-translation-status", () => adminApi.getTranslationStatus());

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.translationStatus")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.tr.subtitle")}</p>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <LoadingState />
        ) : (
          <dl className="bg-white rounded-2xl border border-[#EAEAEA] p-5 space-y-3 text-xs">
            <Row label={t("adminx.tr.configured")} value={data.configured ? t("adminx.tr.yes") : t("adminx.tr.no")} />
            <Row label={t("adminx.tr.lastSuccess")} value={data.lastSuccessAt ? f.date(data.lastSuccessAt) : "—"} />
            <Row label={t("adminx.tr.lastFailure")} value={data.lastFailureAt ? f.date(data.lastFailureAt) : "—"} />
            {data.lastError && <Row label={t("adminx.tr.lastError")} value={data.lastError} />}
          </dl>
        )}
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-bold text-[#111111]">{label}</dt>
      <dd className="text-[#555555] text-right break-words">{value}</dd>
    </div>
  );
}
