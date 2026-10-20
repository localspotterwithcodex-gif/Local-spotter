"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ProductCard } from "@/components/cards/ProductCard";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";

export default function FavoritesPage() {
  const { t } = useLocale();
  const { data, error, loading, reload } = useApiResource("my-favorites", () => api.getFavorites());
  const products = data?.products ?? [];
  const businesses = data?.businesses ?? [];

  return (
    <ConsumerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/account" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("favorites.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("favorites.subtitle")}</p>
        </div>

        {loading ? (
          <LoadingState label={t("favorites.loading")} />
        ) : error ? (
          <ErrorState title={t("favorites.unavailable")} message={error} onRetry={reload} />
        ) : products.length === 0 && businesses.length === 0 ? (
          <EmptyState title={t("favorites.emptyTitle")} description={t("favorites.emptyDesc")} />
        ) : (
          <div className="space-y-8">
            {products.length > 0 && (
              <section aria-labelledby="fav-products" className="space-y-3">
                <h2 id="fav-products" className="text-sm font-bold text-[#111111]">{t("favorites.products")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
            {businesses.length > 0 && (
              <section aria-labelledby="fav-shops" className="space-y-3">
                <h2 id="fav-shops" className="text-sm font-bold text-[#111111]">{t("favorites.stores")}</h2>
                <div className="grid grid-cols-1 gap-4">
                  {businesses.map((b) => (
                    <BusinessCard key={b.id} business={b} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
