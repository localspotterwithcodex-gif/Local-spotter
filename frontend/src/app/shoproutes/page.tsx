"use client";

import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ShoprouteCard } from "@/components/cards/ShoprouteCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";

export default function ShoproutesListingPage() {
  const { t } = useLocale();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const { data, error, loading: isLoading, reload } = useApiResource(`shoproutes:${selectedCity ?? ""}`, () =>
    api.getShoproutes({ city: selectedCity || undefined })
  );
  const routes = data ?? [];

  const cities = ["Delft", "Rotterdam", "Utrecht", "Amsterdam"];

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("routes.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("routes.subtitle")}</p>
        </div>

        {/* City Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#B7B7B7]">{t("routes.city")}</span>
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              selectedCity === null ? "bg-[#54D1CA] text-white" : "bg-[#EAEAEA] text-[#111111]"
            }`}
          >
            {t("routes.allCities")}
          </button>
          {cities.map((city) => (
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
          <LoadingState label={t("routes.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : routes.length === 0 ? (
          <EmptyState
            title={t("routes.noneTitle")}
            description={t("routes.noneDesc")}
            actionLabel={t("routes.viewAllCities")}
            onAction={() => setSelectedCity(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routes.map((route) => (
              <ShoprouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
