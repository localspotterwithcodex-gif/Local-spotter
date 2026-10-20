"use client";

import React, { useState } from "react";
import { LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ProductCard } from "@/components/cards/ProductCard";
import { Input } from "@/components/ui/Input";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { ProductCardSkeleton } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useNearMe } from "@/lib/hooks/useNearMe";

export default function ProductListingPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "popular" | "distance">("newest");
  const nearMe = useNearMe();
  const geo = nearMe.active && nearMe.coords ? { lat: nearMe.coords.lat, lng: nearMe.coords.lng, radiusKm: nearMe.radiusKm } : {};
  const min = minPrice !== "" && Number.isFinite(Number(minPrice)) ? Number(minPrice) : undefined;
  const max = maxPrice !== "" && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : undefined;
  const {
    data,
    error,
    loading: isLoading,
    reload,
  } = useApiResource(
    `products:${selectedCategory ?? ""}:${searchQuery}:${min ?? ""}:${max ?? ""}:${inStock}:${sort}:${geo.lat ?? ""}:${geo.lng ?? ""}:${geo.radiusKm ?? ""}`,
    () =>
      api.getProducts({
        category: selectedCategory || undefined,
        query: searchQuery || undefined,
        minPrice: min,
        maxPrice: max,
        inStock: inStock || undefined,
        sort: sort === "distance" && !geo.lat ? undefined : sort,
        ...geo,
      })
  );
  const products = data ?? [];

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("products.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("products.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder={t("products.search")}
                icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              aria-label={t("products.filterCategories")}
              className="h-12 w-12 rounded-xl bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center hover:bg-[#F5CEE6] transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("filters.minPrice")}
            <input type="number" min={0} inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-10 w-24 rounded-xl border border-[#EAEAEA] px-3 text-[#111111]" />
          </label>
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("filters.maxPrice")}
            <input type="number" min={0} inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-10 w-24 rounded-xl border border-[#EAEAEA] px-3 text-[#111111]" />
          </label>
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("filters.sort")}
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              <option value="newest">{t("filters.sortNewest")}</option>
              <option value="price_asc">{t("filters.sortPriceAsc")}</option>
              <option value="price_desc">{t("filters.sortPriceDesc")}</option>
              <option value="popular">{t("filters.sortPopular")}</option>
              {nearMe.active && <option value="distance">{t("filters.sortDistance")}</option>}
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 font-bold text-[#111111]">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            {t("filters.inStock")}
          </label>
          <button
            type="button"
            onClick={() => (nearMe.active ? nearMe.disable() : nearMe.enable())}
            aria-pressed={nearMe.active}
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 font-bold ${nearMe.active ? "border-[#FA1EFF] bg-[#FAE2F0] text-[#FA1EFF]" : "border-[#EAEAEA] text-[#111111]"}`}
          >
            <LocateFixed className="h-4 w-4" />
            {nearMe.active ? t("filters.nearMeOn", { km: nearMe.radiusKm }) : t("filters.nearMe")}
          </button>
          {nearMe.active && (
            <select value={nearMe.radiusKm} onChange={(e) => nearMe.setRadiusKm(Number(e.target.value))} aria-label={t("filters.radius")} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              {[5, 10, 25, 50, 100].map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          )}
        </div>
        {nearMe.error && <p className="text-xs text-[#ED4C5C]" role="alert">{t(nearMe.error)}</p>}

        {selectedCategory && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#B7B7B7]">{t("products.category")}</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FA1EFF] text-white text-xs font-bold rounded-full">
              {selectedCategory}
              <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:opacity-75" aria-label={t("products.removeFilter")}>
                ×
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : products.length === 0 ? (
          <EmptyState
            title={t("products.noneTitle")}
            description={t("products.noneDesc")}
            actionLabel={t("products.resetFilters")}
            onAction={() => {
              setSearchQuery("");
              setSelectedCategory(null);
              setMinPrice("");
              setMaxPrice("");
              setInStock(false);
              setSort("newest");
              nearMe.disable();
            }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          mode="products"
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>
    </ConsumerLayout>
  );
}
