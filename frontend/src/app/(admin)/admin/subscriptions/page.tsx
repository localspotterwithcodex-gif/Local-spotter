"use client";

import React from "react";
import { Crown } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { MOCK_SUBSCRIPTION_PLANS } from "@/data/mock/subscriptions";
import { formatCurrency } from "@/lib/utils";

export default function AdminSubscriptionsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Abonnementen Beheer</h1>
          <p className="text-xs text-[#B7B7B7]">Beheer actieve abonnementen en tarieven van LocalSpotter.nl</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.id} className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-rubik text-[#111111]">{plan.name}</h3>
                <Crown className="w-5 h-5 text-[#FA1EFF]" />
              </div>
              <div className="text-2xl font-extrabold font-manrope text-[#111111]">
                {formatCurrency(plan.monthlyPrice)} <span className="text-xs text-[#B7B7B7] font-normal">/mnd</span>
              </div>
              <p className="text-xs text-[#555555]">{plan.description}</p>
              <div className="pt-2 border-t border-[#F9F9F9] flex justify-between items-center text-xs">
                <span className="text-[#B7B7B7]">Actieve winkels:</span>
                <span className="font-bold text-[#111111]">42 winkels</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
