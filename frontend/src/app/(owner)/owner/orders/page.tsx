"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { ShopOrdersBoard } from "@/features/orders/ShopOrdersBoard";
import { useLocale } from "@/i18n/LocaleContext";

export default function OwnerOrdersPage() {
  const { t } = useLocale();
  const { business, loading, error, reload } = useMyBusiness();

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.orders.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("ownerx.orders.subtitle")}</p>
        </div>

        {loading ? (
          <LoadingState label={t("ownerx.orders.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !business ? (
          <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forOrders")} />
        ) : (
          <ShopOrdersBoard businessId={business.id} />
        )}
      </div>
    </OwnerLayout>
  );
}
