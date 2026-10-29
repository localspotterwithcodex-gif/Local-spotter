"use client";

import React from "react";
import Link from "next/link";
import { Star, MessageSquare, ArrowLeft, Store, ExternalLink } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

export default function ConsumerReviewsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading, reload } = useApiResource("my-reviews", () => api.getMyReviews());
  const reviews = data ?? [];

  return (
    <ConsumerLayout>
      <div className="max-w-4xl mx-auto my-6 space-y-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA]">
          <div className="flex w-full flex-row-reverse items-center justify-between gap-3">
            <Link
              href="/account"
              aria-label={t("account.back")}
              className="w-10 h-10 rounded-full bg-[#F9F9F9] border border-[#EAEAEA] flex items-center justify-center text-[#111111] hover:bg-[#FAE2F0] hover:text-[#FA1EFF] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-rubik text-[#111111]">
                {t("account.myReviews")}
              </h1>
              <p className="text-xs text-[#B7B7B7]">
                {t("account.reviewsSubtitle")}
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-[#FAE2F0] text-[#FA1EFF] rounded-2xl text-xs font-bold font-manrope">
            {t("account.reviewsCount", { n: reviews.length })}
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <LoadingState label={t("account.reviewsLoading")} />
        ) : error ? (
          <ErrorState title={t("account.reviewsUnavailable")} message={error} onRetry={reload} />
        ) : reviews.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#EAEAEA] text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F9F9F9] text-[#B7B7B7] flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#111111]">{t("account.reviewsEmptyTitle")}</h2>
              <p className="text-xs text-[#B7B7B7] max-w-sm mx-auto">
                {t("account.reviewsEmptyDesc")}
              </p>
            </div>
            <Link href="/products">
              <Button variant="primary" className="mt-2">
                {t("account.discoverProducts")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const businessName = review.businessName || t("account.defaultShop");

              return (
                <div
                  key={review.id}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EAEAEA] shadow-xs space-y-3 transition-all hover:border-[#FAE2F0]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#FA1EFF]" />
                        <span className="text-xs font-bold text-[#111111]">{businessName}</span>
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "text-[#D4B011] fill-[#D4B011]"
                                : "text-[#DADADA]"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-[#111111] ml-1">
                          {review.rating}.0
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#B7B7B7]">
                        {f.date(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {review.title && (
                    <h3 className="text-sm font-bold text-[#111111]">{review.title}</h3>
                  )}

                  <p className="text-xs text-[#111111] leading-relaxed bg-[#F9F9F9] p-3 rounded-2xl border border-[#EAEAEA]">
                    &quot;{review.comment}&quot;
                  </p>


                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <DeleteButton
                      confirmText={t("manage.del.review")}
                      onConfirm={async () => {
                        await api.deleteReview(review.id);
                        reload();
                      }}
                    />
                    <Link
                      href={`/businesses/${review.businessId}`}
                      className="text-xs text-[#FA1EFF] hover:underline font-bold flex items-center gap-1"
                    >
                      {t("account.viewShop")} <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
