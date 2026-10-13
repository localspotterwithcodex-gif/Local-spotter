"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { formatCurrency } from "@/lib/utils";

export default function OnboardingSuccessPage() {
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const plans = useApiResource("subscription-plans", () => api.getSubscriptionPlans());
  const subRes = useApiResource(businessId && `owner-subscription:${businessId}`, () => api.getBusinessSubscription(businessId!));

  if (businessLoading || plans.loading || subRes.loading) {
    return (
      <ConsumerLayout>
        <LoadingState label="Gegevens laden..." />
      </ConsumerLayout>
    );
  }
  const loadError = businessError ?? plans.error ?? subRes.error;
  if (loadError) {
    return (
      <ConsumerLayout>
        <ErrorState message={loadError} onRetry={businessError ? reloadBusiness : plans.error ? plans.reload : subRes.reload} />
      </ConsumerLayout>
    );
  }
  if (!business) {
    return (
      <ConsumerLayout>
        <EmptyState title="Nog geen winkel" description="Er is nog geen winkel voor dit account aangemaakt." />
      </ConsumerLayout>
    );
  }

  const sub = subRes.data ?? null;
  const plan = sub ? plans.data?.find((p) => p.slug === sub.planSlug) : undefined;
  const subActive = sub?.status === "ACTIVE";
  const shopLive = business.status === "ACTIVE";

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-[#EAEAEA] shadow-lg text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto shadow-sm animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAE2F0] text-[#FA1EFF] rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Gefeliciteerd!
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-rubik text-[#111111]">
            Shop Created Successfully
          </h1>
          <p className="text-xs text-[#555555] max-w-xs mx-auto leading-relaxed">
            Je winkel {business.name} is aangemaakt op LocalSpotter.nl.
            {subActive
              ? " Je kunt nu producten en workshops toevoegen!"
              : " Je abonnement is nog niet actief: online betalen is nog niet beschikbaar. Zodra de betaling is verwerkt wordt het geactiveerd."}
          </p>
        </div>

        <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] text-left text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-[#111111]">
            <span>Status Account:</span>
            <span className={`flex items-center gap-1 ${shopLive ? "text-[#3B9B52]" : "text-[#790166]"}`}>
              <span className={`w-2 h-2 rounded-full ${shopLive ? "bg-[#3B9B52]" : "bg-[#790166]"}`} />{" "}
              {shopLive ? "Actief" : business.status === "PENDING_APPROVAL" ? "In afwachting van goedkeuring" : "Inactief"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#B7B7B7]">
            <span>Abonnement:</span>
            <span className="text-[#111111] font-bold">
              {sub
                ? `${plan ? `${plan.name} Plan (${formatCurrency(plan.monthlyPrice)}/mnd)` : sub.planSlug}${subActive ? "" : " - nog niet actief"}`
                : "Geen abonnement gekozen"}
            </span>
          </div>
        </div>

        <Link href="/owner" className="block pt-2">
          <Button variant="primary" size="lg" fullWidth className="gap-2">
            GO TO MY SHOP <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </ConsumerLayout>
  );
}
