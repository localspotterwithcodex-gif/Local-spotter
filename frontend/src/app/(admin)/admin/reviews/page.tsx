"use client";

import React, { useState } from "react";
import { Star, Trash2, Eye } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type ReviewStatus } from "@/lib/api/admin";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminReviewsPage() {
  const { t, label } = useLocale();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-reviews-${status}-${offset}`, () =>
    adminApi.getReviews({ status: (status || undefined) as ReviewStatus | undefined, limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const reviews = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.reviewModeration")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.reviews.subtitle")}</p>
        </div>

        <AdminFilters
          selects={[{ key: "status", label: t("common.status"), value: status, onChange: (v) => { setStatus(v); setOffset(0); }, options: (["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"] as const).map((v) => ({ value: v, label: label("status", v) })) }]}
          onReset={() => { setStatus(""); setOffset(0); }}
        />

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || reviews.length === 0 ? (
          <EmptyState title={t("adminx.reviews.emptyTitle")} description={t("adminx.reviews.emptyDesc")} />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const visible = r.status === "PUBLISHED" || r.status === "PENDING";
              return (
                <div
                  key={r.id}
                  className={`bg-white p-4 rounded-2xl border border-[#EAEAEA] flex items-start justify-between gap-4 ${visible ? "" : "opacity-60"}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111111]">{r.consumerName}</span>
                      <div className="flex items-center text-[#D4B011]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-xs font-bold ml-1">{r.rating}</span>
                      </div>
                      <span className="text-[10px] text-[#B7B7B7]">
                        {r.businessName} • {label("status", r.status)}
                      </span>
                    </div>
                    {r.title && <h4 className="text-xs font-bold text-[#111111]">{r.title}</h4>}
                    <p className="text-xs text-[#555555]">{r.comment}</p>
                  </div>

                  {visible ? (
                    <button
                      onClick={() => action.run(r.id, () => adminApi.moderateReview(r.id, "HIDDEN"))}
                      disabled={action.busyId !== null}
                      className="p-2 text-[#ED4C5C] hover:bg-[#F2D9DE] rounded-xl transition-colors shrink-0 disabled:opacity-50"
                      title={t("adminx.reviews.hide")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => action.run(r.id, () => adminApi.moderateReview(r.id, "PUBLISHED"))}
                      disabled={action.busyId !== null}
                      className="p-2 text-[#3B9B52] hover:bg-[#CBF5D5] rounded-xl transition-colors shrink-0 disabled:opacity-50"
                      title={t("adminx.reviews.restore")}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden empty:hidden">
              <AdminPager meta={data.meta} onOffsetChange={setOffset} />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
