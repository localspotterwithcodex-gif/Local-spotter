"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";

export interface FilterSelect {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface Props {
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  selects?: FilterSelect[];
  /** Called by "Clear filters"; the page resets its own filter state. */
  onReset: () => void;
}

/** One row of filters above an admin table: optional search box, dropdowns, and a clear button. */
export function AdminFilters({ search, selects = [], onReset }: Props) {
  const { t } = useLocale();
  const active = (search?.value ?? "") !== "" || selects.some((s) => s.value !== "");
  return (
    <div className="flex flex-wrap items-end gap-3" role="search" aria-label={t("adminx.filters.title")}>
      {search && (
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">{t("common.search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7B7B7]" aria-hidden="true" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            className="h-10 w-full rounded-xl border border-transparent bg-[#EAEAEA] pl-9 pr-3 text-xs font-medium text-[#111111] placeholder:text-[#B7B7B7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
        </label>
      )}
      {selects.map((s) => (
        <label key={s.key} className="block">
          <span className="mb-1 block text-[11px] font-bold text-[#6B6B6B]">{s.label}</span>
          <select
            value={s.value}
            onChange={(e) => s.onChange(e.target.value)}
            className="h-10 min-w-36 rounded-xl border border-transparent bg-[#EAEAEA] px-3 text-xs font-bold text-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          >
            <option value="">{t("common.all")}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active && (
        <button type="button" onClick={onReset} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[#790166] hover:bg-[#FAE2F0]">
          <X className="h-4 w-4" aria-hidden="true" /> {t("adminx.filters.clear")}
        </button>
      )}
    </div>
  );
}
