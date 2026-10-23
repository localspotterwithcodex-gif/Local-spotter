"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { SOCIAL_LABEL, SOCIAL_PLACEHOLDER, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/social-links";

export interface SocialRow {
  platform: SocialPlatform;
  url: string;
}

interface Props {
  value: SocialRow[];
  onChange: (rows: SocialRow[]) => void;
}

/** A list of social profiles (one per platform) with a "+" button to add another. Blank rows are dropped when saving. */
export function SocialLinksEditor({ value, onChange }: Props) {
  const { t } = useLocale();
  const used = new Set(value.map((r) => r.platform));
  const nextFree = SOCIAL_PLATFORMS.find((p) => !used.has(p));

  const update = (index: number, patch: Partial<SocialRow>) => onChange(value.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#111111]">{t("manage.social.title")}</span>
        <button
          type="button"
          disabled={!nextFree}
          onClick={() => nextFree && onChange([...value, { platform: nextFree, url: "" }])}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#FAE2F0] px-3 py-1.5 text-xs font-bold text-[#FA1EFF] hover:bg-[#F7CDE8] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("manage.social.add")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> {t("manage.social.add")}
        </button>
      </div>

      {value.length === 0 && <p className="text-xs text-[#B7B7B7]">{t("manage.social.empty")}</p>}

      {value.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <select
            value={row.platform}
            onChange={(e) => update(index, { platform: e.target.value as SocialPlatform })}
            aria-label={t("manage.social.platform")}
            className="h-12 w-40 shrink-0 rounded-lg border border-transparent bg-[#EAEAEA] px-3 text-sm font-bold text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          >
            {SOCIAL_PLATFORMS.filter((p) => p === row.platform || !used.has(p)).map((p) => (
              <option key={p} value={p}>
                {SOCIAL_LABEL[p]}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={row.url}
            onChange={(e) => update(index, { url: e.target.value })}
            placeholder={SOCIAL_PLACEHOLDER[row.platform]}
            aria-label={`${SOCIAL_LABEL[row.platform]} URL`}
            className="h-12 min-w-0 flex-1 rounded-lg border border-transparent bg-[#EAEAEA] px-4 text-[15px] text-[#111111] placeholder:text-[#B7B7B7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label={t("manage.social.remove")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6B6B6B] hover:bg-[#EAEAEA] hover:text-red-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
