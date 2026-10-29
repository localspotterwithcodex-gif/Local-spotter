"use client";

import React, { useState } from "react";
import { Star, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { Button } from "@/components/ui/Button";
import type { ReviewableItem } from "@/types/review";

interface Props {
  item: ReviewableItem;
  onClose: () => void;
  /** Called once the review is saved (the list behind the modal should reload). */
  onSubmitted: () => void;
}

/** Star rating (+ optional remark) for a delivered order or an attended workshop, then a thank-you message. */
export function ReviewModal({ item, onClose, onSubmitted }: Props) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (rating < 1) return setError(t("manage.review.pickStars"));
    setBusy(true);
    setError(null);
    try {
      await api.createReviewFor(item, rating, comment.trim());
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="review-title" className="text-base font-bold font-rubik text-[#111111]">
              {done ? t("manage.review.thanksTitle") : t("manage.review.title")}
            </h2>
            <p className="text-xs text-[#B7B7B7] truncate">{item.businessName} · {item.label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="text-[#B7B7B7] hover:text-[#111111]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center space-y-3 py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#2E9E6B]" />
            <p className="text-sm font-bold text-[#111111]">{t("manage.review.thanks")}</p>
            <Button variant="primary" fullWidth onClick={onClose}>{t("common.close")}</Button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-1" role="radiogroup" aria-label={t("manage.review.title")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={t("manage.review.starN", { n })}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star className={`w-9 h-9 ${n <= shown ? "text-[#D4B011] fill-[#D4B011]" : "text-[#DADADA]"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t("manage.review.placeholder")}
              className="w-full rounded-2xl border border-[#EAEAEA] bg-[#F9F9F9] p-3 text-xs outline-none focus:border-[#FA1EFF]"
            />
            {error && <p role="alert" className="text-xs font-bold text-[#E54666]">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" fullWidth disabled={busy} onClick={onClose}>{t("manage.review.later")}</Button>
              <Button variant="primary" fullWidth isLoading={busy} onClick={() => void submit()}>{t("manage.review.send")}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
