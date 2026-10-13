"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Store, ArrowRight, Sparkles } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";

export default function OnboardingSuccessPage() {
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
            Je winkel is succesvol aangemaakt op LocalSpotter.nl. Je kunt nu producten en workshops toevoegen!
          </p>
        </div>

        <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] text-left text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-[#111111]">
            <span>Status Account:</span>
            <span className="text-[#3B9B52] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3B9B52]" /> Actief
            </span>
          </div>
          <div className="flex items-center justify-between text-[#B7B7B7]">
            <span>Abonnement:</span>
            <span className="text-[#111111] font-bold">Workshop Plan (€150/mnd)</span>
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
