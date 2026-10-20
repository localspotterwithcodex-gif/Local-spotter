"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";

export default function StaffWorkshopsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(params);
  const { t } = useLocale();
  const list = useApiResource(`staff-workshops:${businessId}`, () => api.getBusinessWorkshops(businessId));

  return (
    <RoleLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <Link href="/staff" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" /> {t("staff.title")}
        </Link>
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("staff.workshops")}</h1>
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
                </div>
                <Link href={`/staff/${businessId}/workshops/${w.id}`} className="flex items-center gap-1 text-xs font-bold text-[#FA1EFF] shrink-0">
                  <Users className="w-4 h-4" /> {t("ownerx.workshops.participants")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RoleLayout>
  );
}
