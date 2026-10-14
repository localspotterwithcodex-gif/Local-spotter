"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function OwnerPayoutsPage() {
  const { t } = useLocale();
  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.payouts.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("ownerx.payouts.subtitle")}</p>
        </div>

        {/* Payout model is still an open decision (D-005): nothing is shown that the backend cannot provide. */}
        <EmptyState
          title={t("ownerx.payouts.emptyTitle")}
          description={t("ownerx.payouts.emptyDesc")}
        />
      </div>
    </OwnerLayout>
  );
}
