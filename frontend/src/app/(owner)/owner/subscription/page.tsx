"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Check, ArrowUpRight } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { MOCK_SUBSCRIPTION_PLANS } from "@/data/mock/subscriptions";
import { formatCurrency } from "@/lib/utils";

export default function OwnerSubscriptionPage() {
  const [currentPlan, setCurrentPlan] = useState("workshop");

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Abonnement Beheren</h1>
          <p className="text-xs text-[#B7B7B7]">Bekijk je huidige pakket of wijzig je abonnement</p>
        </div>

        {/* Current Active Subscription Banner */}
        <div className="bg-white p-6 rounded-3xl border border-[#FAE2F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-2xl">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <span className="bg-[#CBF5D5] text-[#3B9B52] text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block mb-1">
                Actief Abonnement
              </span>
              <h2 className="text-lg font-bold font-rubik text-[#111111]">Workshop Plan (€150/maand)</h2>
              <p className="text-xs text-[#B7B7B7]">Automatisch verlengd op 1 april 2026</p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="shrink-0 text-xs">
            Abonnement Opzeggen
          </Button>
        </div>

        {/* Plans Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {MOCK_SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.slug;
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
                    disabled={isCurrent}
                    onClick={() => setCurrentPlan(plan.slug)}
                  >
                    {isCurrent ? "Actief Pakket" : "Wissel naar dit pakket"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </OwnerLayout>
  );
}
