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
import { uniqueCities } from "@/lib/cities";
import { useLocale } from "@/i18n/LocaleContext";

export default function ShoproutesListingPage() {
  const { t } = useLocale();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const { data, error, loading: isLoading, reload } = useApiResource(
    `shoproutes:${selectedCity ?? ""}:${theme}:${maxDistance}:${maxDuration}`,
    () =>
      api.getShoproutes({
        city: selectedCity || undefined,
        theme: theme || undefined,
        maxDistanceKm: maxDistance ? Number(maxDistance) : undefined,
        maxDurationMinutes: maxDuration ? Number(maxDuration) : undefined,
      })
  );
  const routes = data ?? [];

  // City chips come from the cities of routes owners have actually published.
  const { data: allRoutes } = useApiResource("shoproutes:all", () => api.getShoproutes());
  const cities = uniqueCities([...(allRoutes ?? []).map((r) => r.cityName), selectedCity]);
  const themes = uniqueCities([...(allRoutes ?? []).map((r) => r.theme), theme]);

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("routes.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("routes.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("routes.theme")}
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              <option value="">{t("routes.allThemes")}</option>
              {themes.map((th) => (
                <option key={th} value={th}>{th}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("routes.maxDistance")}
            <select value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              <option value="">{t("routes.any")}</option>
              {[2, 5, 10, 20].map((km) => (
                <option key={km} value={km}>≤ {km} km</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold text-[#B7B7B7]">
            {t("routes.maxDuration")}
            <select value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)} className="h-10 rounded-xl border border-[#EAEAEA] bg-white px-3 text-[#111111]">
              <option value="">{t("routes.any")}</option>
              {[60, 120, 180, 240].map((m) => (
                <option key={m} value={m}>≤ {m / 60} h</option>
              ))}
            </select>
          </label>
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
