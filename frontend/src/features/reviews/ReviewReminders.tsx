"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { ReviewModal } from "./ReviewModal";
import type { ReviewableItem } from "@/types/review";

/** Dashboard reminder: delivered orders / attended workshops that are still waiting for a review. Stays until reviewed. */
export function ReviewReminders() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, reload } = useApiResource("my-reviewable", () => api.getReviewable());
  const [active, setActive] = useState<ReviewableItem | null>(null);
  const items = data ?? [];
  if (items.length === 0 && !active) return null;

  return (
    <section aria-labelledby="review-reminders" className="bg-[#FFF8E1] border border-[#F3E2A0] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-[#D4B011] fill-[#D4B011]" />
        <h2 id="review-reminders" className="text-xs font-bold text-[#111111]">{t("manage.review.reminderTitle", { n: items.length })}</h2>
      </div>
      <p className="text-[11px] text-[#555555]">{t("manage.review.reminderDesc")}</p>
      <ul className="space-y-2">
        {items.slice(0, 5).map((it) => (
          <li key={`${it.kind}:${it.id}`} className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2">
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[#111111] truncate">{it.businessName}</span>
              <span className="block text-[11px] text-[#B7B7B7] truncate">{it.label} · {f.date(it.date)}</span>
            </span>
            <button type="button" onClick={() => setActive(it)} className="shrink-0 rounded-xl bg-[#FA1EFF] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#E000EC]">
              {t("manage.review.button")}
            </button>
          </li>
        ))}
      </ul>
      {active && <ReviewModal item={active} onClose={() => setActive(null)} onSubmitted={reload} />}
    </section>
  );
}
