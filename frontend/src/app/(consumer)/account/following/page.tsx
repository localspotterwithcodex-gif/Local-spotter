"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function ConsumerFollowingPage() {
  const { t } = useLocale();
  const { data, error, loading: isLoading, reload } = useApiResource("my-following", () => api.getFollowedBusinesses());
  const businesses = data ?? [];

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("account.followedStores")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("account.followingSubtitle")}</p>
        </div>

        {isLoading ? (
          <LoadingState label={t("account.followingLoading")} />
        ) : error ? (
          <ErrorState title={t("account.followingUnavailable")} message={error} onRetry={reload} />
        ) : businesses.length === 0 ? (
          <EmptyState
            title={t("account.followingEmptyTitle")}
            description={t("account.followingEmptyDesc")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
