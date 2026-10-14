"use client";

import React from "react";
import { Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { PLAN_DESCRIPTION_KEYS } from "@/content/plan-features";
import type { PlanSlug } from "@/types/subscription";

export default function AdminSubscriptionsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading, reload } = useApiResource("admin-subscriptions", async () => {
    const [plans, active] = await Promise.all([adminApi.getPlans(), adminApi.getSubscriptions({ status: "ACTIVE", limit: 500 })]);
    const counts = new Map<string, number>();
    for (const s of active.items) counts.set(s.planName, (counts.get(s.planName) ?? 0) + 1);
    return plans.map((plan) => ({ plan, activeShops: counts.get(plan.name) ?? 0 }));
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.subscriptionsManagement")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.subs.subtitle")}</p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || data.length === 0 ? (
          <EmptyState title={t("adminx.subs.emptyTitle")} description={t("adminx.subs.emptyDesc")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.map(({ plan, activeShops }) => (
              <div key={plan.id} className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-rubik text-[#111111]">{plan.name}</h3>
                  <Crown className="w-5 h-5 text-[#FA1EFF]" />
                </div>
                <div className="text-2xl font-extrabold font-manrope text-[#111111]">
                  {f.currency(plan.monthlyPrice)} <span className="text-xs text-[#B7B7B7] font-normal">{t("adminx.dash.perMonthShort")}</span>
                </div>
                <p className="text-xs text-[#555555]">{PLAN_DESCRIPTION_KEYS[plan.slug as PlanSlug] ? t(PLAN_DESCRIPTION_KEYS[plan.slug as PlanSlug]) : plan.description}</p>
                <div className="pt-2 border-t border-[#F9F9F9] flex justify-between items-center text-xs">
                  <span className="text-[#B7B7B7]">{t("adminx.subs.activeShops")}</span>
                  <span className="font-bold text-[#111111]">{t("adminx.subs.shopsCount", { n: activeShops })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
