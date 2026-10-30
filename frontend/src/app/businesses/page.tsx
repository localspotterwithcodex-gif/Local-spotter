"use client";

import React, { useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { SmartSearchInput } from "@/components/search/SmartSearchInput";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { uniqueCities } from "@/lib/cities";
import { useLocale } from "@/i18n/LocaleContext";
import { useNearMe } from "@/lib/hooks/useNearMe";

export default function BusinessListingPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sort, setSort] = useState<"newest" | "rating" | "name" | "distance">("newest");
  const nearMe = useNearMe();
  const geo = nearMe.active && nearMe.coords ? { lat: nearMe.coords.lat, lng: nearMe.coords.lng, radiusKm: nearMe.radiusKm } : {};
  const {
    data,
    error,
    loading: isLoading,
    reload,
  } = useApiResource(`businesses:${selectedCity ?? ""}:${searchQuery}:${sort}:${geo.lat ?? ""}:${geo.lng ?? ""}:${geo.radiusKm ?? ""}`, () =>
    api.getBusinesses({
      query: searchQuery || undefined,
      city: selectedCity || undefined,
      sort: sort === "distance" && !geo.lat ? undefined : sort,
      ...geo,
    })
  );
  const businesses = data ?? [];

  // City chips come from the cities of shops owners have actually published.
  const { data: allBusinesses } = useApiResource("businesses:all", () => api.getBusinesses());
  const cities = uniqueCities([
    ...(allBusinesses ?? []).map((b) => b.location.city),
    selectedCity,
  ]);

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("shops.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("shops.subtitle")}</p>
          </div>

          <div className="w-full sm:w-72">
            <SmartSearchInput
              placeholder={t("shops.search")}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        {/* City Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#B7B7B7]">{t("shops.city")}</span>
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              selectedCity === null ? "bg-[#FA1EFF] text-white" : "bg-[#EAEAEA] text-[#111111]"
            }`}
          >
            {t("shops.allCities")}
          </button>
          {cities.length > 0 && cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                selectedCity === city ? "bg-[#54D1CA] text-white" : "bg-[#EAEAEA] text-[#111111]"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {city}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("filters.sort")}
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              <option value="newest">{t("filters.sortNewest")}</option>
              <option value="rating">{t("filters.sortRating")}</option>
              <option value="name">{t("filters.sortName")}</option>
              {nearMe.active && <option value="distance">{t("filters.sortDistance")}</option>}
            </select>
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

        {isLoading ? (
          <LoadingState label={t("shops.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : businesses.length === 0 ? (
          <EmptyState
            title={t("shops.noneTitle")}
            description={t("shops.noneDesc")}
            actionLabel={t("shops.resetSearch")}
            onAction={() => {
              setSearchQuery("");
              setSelectedCity(null);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
