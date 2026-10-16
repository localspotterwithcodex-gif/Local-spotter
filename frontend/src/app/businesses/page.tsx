"use client";

import React, { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { uniqueCities } from "@/lib/cities";
import { useLocale } from "@/i18n/LocaleContext";

export default function BusinessListingPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const {
    data,
    error,
    loading: isLoading,
    reload,
  } = useApiResource(`businesses:${selectedCity ?? ""}:${searchQuery}`, () =>
    api.getBusinesses({ query: searchQuery || undefined, city: selectedCity || undefined })
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
            <Input
              placeholder={t("shops.search")}
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
