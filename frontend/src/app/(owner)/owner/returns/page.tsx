"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ShopReturnsBoard } from "@/features/returns/ShopReturnsBoard";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";

export default function OwnerReturnsPage() {
  const { t } = useLocale();
  const { business, loading, error, reload } = useMyBusiness();
  return (
    <OwnerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>
        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("returns.shop.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("returns.shop.subtitle")}</p>
        </div>
        {loading ? (
          <LoadingState label={t("returns.shop.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !business ? (
          <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forSubscription")} />
        ) : (
          <ShopReturnsBoard businessId={business.id} />
        )}
      </div>
    </OwnerLayout>
  );
}
