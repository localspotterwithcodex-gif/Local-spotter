"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, ArrowRight } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { PlanSlug } from "@/types/subscription";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { PLAN_DESCRIPTION_KEYS, PLAN_FEATURE_KEYS } from "@/content/plan-features";

export default function SubscriptionSelectionPage() {
  const router = useRouter();
  const { t } = useLocale();
  const f = useFormat();
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>("workshop");
  const plansRes = useApiResource("subscription-plans", () => api.getSubscriptionPlans());
  const plans = plansRes.data ?? [];

  const handleNext = () => {
    router.push(`/onboarding/subscription/payment?plan=${selectedPlan}`);
  };

  return (
    <ConsumerLayout>
      <div className="max-w-4xl mx-auto my-6 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-2">
            <Crown className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-rubik text-[#111111]">
            {t("onb.sub.title")}
          </h1>
          <p className="text-sm text-[#B7B7B7] max-w-md mx-auto">
            {t("onb.sub.subtitle")}
          </p>
        </div>

        {plansRes.loading && <LoadingState label={t("onb.sub.loading")} />}
        {plansRes.error && <ErrorState message={plansRes.error} onRetry={plansRes.reload} />}
        {!plansRes.loading && !plansRes.error && plans.length === 0 && (
          <EmptyState title={t("onb.sub.emptyTitle")} description={t("onb.sub.emptyDesc")} />
        )}

        {/* 3 Subscription Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.slug;
            const isPopular = plan.slug === "workshop";

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.slug)}
                className={`relative bg-white rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-[#FA1EFF] shadow-lg ring-2 ring-[#FAE2F0]"
                    : "border-[#EAEAEA] hover:border-[#FAE2F0]"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FA1EFF] text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-xs">
                    {t("onb.sub.popular")}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold font-rubik text-[#111111]">{plan.name}</h3>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "bg-[#FA1EFF] border-[#FA1EFF] text-white"
                          : "border-[#B7B7B7]"
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-3xl font-extrabold text-[#111111] font-manrope">
                      {f.currency(plan.monthlyPrice)}
                    </span>
                    <span className="text-xs text-[#B7B7B7]">{t("onb.sub.perMonthExVat")}</span>
                  </div>

                  <p className="text-xs text-[#555555] leading-relaxed">{PLAN_DESCRIPTION_KEYS[plan.slug] ? t(PLAN_DESCRIPTION_KEYS[plan.slug]) : plan.description}</p>

                  <ul className="space-y-2 pt-2 border-t border-[#F9F9F9]">
                    {(PLAN_FEATURE_KEYS[plan.slug]?.map((k) => t(k)) ?? plan.features).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-medium text-[#111111]">
                        <Check className="w-4 h-4 text-[#FA1EFF] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    size="md"
                    fullWidth
                  >
                    {isSelected ? t("onb.sub.selected") : t("onb.sub.choose")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 max-w-md mx-auto sm:max-w-none">
          <Button variant="primary" size="lg" className="w-full sm:w-64 gap-2" onClick={handleNext} disabled={!plans.some((p) => p.slug === selectedPlan)}>
            {t("onb.next")} <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </ConsumerLayout>
  );
}
