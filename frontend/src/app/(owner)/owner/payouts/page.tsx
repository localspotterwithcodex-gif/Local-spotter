"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ArrowDownRight, Clock, CheckCircle2, Building2 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

export default function OwnerPayoutsPage() {
  const [requested, setRequested] = useState(false);
  const [iban, setIban] = useState("NL91 ABNA 0417 1234 56");
  const availableBalance = 428.50;
  const pendingBalance = 153.95;

  const handleRequestPayout = () => {
    setRequested(true);
    setTimeout(() => setRequested(false), 3000);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Uitbetalingen & Saldo</h1>
          <p className="text-xs text-[#B7B7B7]">Beheer je opgebouwde verkopen en vraag uitbetalingen aan</p>
        </div>

        {/* Balance Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <span className="text-xs font-bold text-[#B7B7B7] block">Beschikbaar Saldo voor Opname</span>
            <div className="text-3xl font-extrabold font-rubik text-[#111111]">
              {formatCurrency(availableBalance)}
            </div>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={availableBalance <= 0 || requested}
              onClick={handleRequestPayout}
              className="gap-2"
            >
              {requested ? "Uitbetaling Aangevraagd!" : "Vraag Uitbetaling Aan"}
            </Button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <span className="text-xs font-bold text-[#B7B7B7] block">Gereserveerd Saldo (Lopende Orders)</span>
            <div className="text-3xl font-extrabold font-rubik text-[#B7B7B7]">
              {formatCurrency(pendingBalance)}
            </div>
            <p className="text-xs text-[#B7B7B7]">
              Wordt automatisch overgeheveld naar beschikbaar saldo zodra de bestellingen zijn bezorgd.
            </p>
          </div>
        </div>

        {/* Payout IBAN Account Settings */}
        <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#FA1EFF]" /> Uitbetalingsrekening (IBAN)
          </h3>
          <Input
            label="IBAN Rekeningnummer"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            helperText="Uitbetalingen worden na admin goedkeuring overgemaakt naar dit rekeningnummer."
          />
        </div>

        {/* Payout History */}
        <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold font-rubik text-[#111111]">Uitbetalingshistorie</h3>
          <div className="space-y-3">
            <div className="p-3.5 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-[#111111] block">Uitbetaling #PO-882</span>
                <span className="text-[#B7B7B7]">25 februari 2026</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-[#111111]">{formatCurrency(350.00)}</span>
                <span className="px-2.5 py-1 bg-[#CBF5D5] text-[#3B9B52] font-bold rounded-full text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Uitbetaald
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
