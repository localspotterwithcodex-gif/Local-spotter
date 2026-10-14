"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";

export default function WorkshopListingPage() {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, error, loading: isLoading, reload } = useApiResource("workshops", () => api.getWorkshops());
  const needle = searchQuery.toLowerCase();
  const workshops = (data ?? []).filter(
    (w) => !needle || w.title.toLowerCase().includes(needle) || w.description.toLowerCase().includes(needle)
  );

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("workshops.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("workshops.subtitle")}</p>
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder={t("workshops.search")}
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState label={t("workshops.loading")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : workshops.length === 0 ? (
          <EmptyState
            title={t("workshops.noneTitle")}
            description={t("workshops.noneDesc")}
            actionLabel={t("workshops.resetSearch")}
            onAction={() => setSearchQuery("")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
