"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Check, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { getErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PlanSlug } from "@/types/subscription";

export default function OwnerSubscriptionPage() {
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;

  const plansRes = useApiResource("subscription-plans", () => api.getSubscriptionPlans());
  const subRes = useApiResource(businessId && `owner-subscription:${businessId}`, () => api.getBusinessSubscription(businessId!));

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const plans = plansRes.data ?? [];
  const sub = subRes.data ?? null;
  const isActive = sub?.status === "ACTIVE";
  const currentPlan = sub ? plans.find((p) => p.slug === sub.planSlug) : undefined;

  const handleSelect = async (slug: PlanSlug) => {
    if (!businessId) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const updated = await api.selectPlan(businessId, slug);
      if (updated.status !== "ACTIVE") {
        setNotice(
          "Je pakket is geselecteerd, maar nog niet actief: online betalen is nog niet beschikbaar. Zodra de betaling is afgerond wordt het abonnement geactiveerd."
        );
      }
      subRes.reload();
      reloadBusiness();
    } catch (err) {
      setActionError(getErrorMessage(err, "Pakket wijzigen mislukt"));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!businessId) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await api.cancelSubscription(businessId);
      subRes.reload();
      reloadBusiness();
    } catch (err) {
      setActionError(getErrorMessage(err, "Abonnement opzeggen mislukt"));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <>
      <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
        <ArrowLeft className="w-4 h-4" />
        Terug naar dashboard
      </Link>

      <div>
        <h1 className="text-xl font-bold font-rubik text-[#111111]">Abonnement Beheren</h1>
        <p className="text-xs text-[#B7B7B7]">Bekijk je huidige pakket of wijzig je abonnement</p>
      </div>
    </>
  );

  if (businessLoading || plansRes.loading || subRes.loading) {
    return (
      <OwnerLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {header}
          <LoadingState label="Abonnement laden..." />
        </div>
      </OwnerLayout>
    );
  }

  const loadError = businessError ?? plansRes.error ?? subRes.error;
  if (loadError) {
    const retry = businessError ? reloadBusiness : plansRes.error ? plansRes.reload : subRes.reload;
    return (
      <OwnerLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {header}
          <ErrorState message={loadError} onRetry={retry} />
        </div>
      </OwnerLayout>
    );
  }

  if (!business) {
    return (
      <OwnerLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {header}
          <EmptyState title="Nog geen winkel" description="Maak eerst een winkel aan om een abonnement te kiezen." />
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {header}

        {(actionError || notice) && (
          <div
            className={`p-3 text-xs font-bold rounded-xl flex items-center gap-2 ${
              actionError ? "bg-[#F2D9DE] text-[#E54666]" : "bg-[#FAE2F0] text-[#790166]"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError || notice}
          </div>
        )}

        {/* Current Subscription Banner */}
        <div className="bg-white p-6 rounded-3xl border border-[#FAE2F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-2xl">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              {sub ? (
                <>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mb-1 ${
                      isActive ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#F2D9DE] text-[#E54666]"
                    }`}
                  >
                    {isActive
                      ? "Actief Abonnement"
                      : sub.status === "CANCELLED"
                        ? "Opgezegd"
                        : sub.status === "PAST_DUE"
                          ? "Betaling achterstallig"
                          : "Nog niet actief"}
                  </span>
                  <h2 className="text-lg font-bold font-rubik text-[#111111]">
                    {currentPlan
                      ? `${currentPlan.name} (${formatCurrency(currentPlan.monthlyPrice)}/maand)`
                      : sub.planSlug}
                  </h2>
                  <p className="text-xs text-[#B7B7B7]">
                    {isActive
                      ? `${sub.autoRenew ? "Automatisch verlengd" : "Loopt af"} op ${formatDate(sub.currentPeriodEnd)}`
                      : "Dit abonnement geeft nog geen toegang tot de betaalde functies."}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold font-rubik text-[#111111]">Geen abonnement</h2>
                  <p className="text-xs text-[#B7B7B7]">Kies hieronder een pakket om je winkel zichtbaar te maken.</p>
                </>
              )}
            </div>
          </div>

          {sub && sub.status !== "CANCELLED" && (
            <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={handleCancel} disabled={busy}>
              Abonnement Opzeggen
            </Button>
          )}
        </div>

        {/* Plans Comparison */}
        {plans.length === 0 ? (
          <EmptyState title="Geen pakketten beschikbaar" description="Er zijn momenteel geen abonnementen om uit te kiezen." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {plans.map((plan) => {
              const isCurrent = !!sub && sub.status !== "CANCELLED" && sub.planSlug === plan.slug;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl p-6 border-2 flex flex-col justify-between ${
                    isCurrent ? "border-[#FA1EFF] shadow-md" : "border-[#EAEAEA]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold font-rubik text-[#111111]">{plan.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-bold bg-[#FA1EFF] text-white px-2 py-0.5 rounded-full">
                          Huidig
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-[#111111]">
                      {formatCurrency(plan.monthlyPrice)} <span className="text-xs text-[#B7B7B7] font-normal">/mnd</span>
                    </div>
                    <ul className="space-y-1.5 pt-2 border-t border-[#F9F9F9]">
                      {plan.features.map((f, i) => (
                        <li key={i} className="text-xs text-[#555555] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#FA1EFF] shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant={isCurrent ? "secondary" : "outline"}
                      size="sm"
                      fullWidth
                      disabled={isCurrent || busy}
                      onClick={() => handleSelect(plan.slug)}
                    >
                      {isCurrent ? (isActive ? "Actief Pakket" : "Gekozen Pakket") : "Wissel naar dit pakket"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
