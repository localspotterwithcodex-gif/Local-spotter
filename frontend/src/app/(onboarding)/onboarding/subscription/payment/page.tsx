"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CreditCard, ArrowRight, CheckCircle2 } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { MOCK_SUBSCRIPTION_PLANS } from "@/data/mock/subscriptions";
import { formatCurrency } from "@/lib/utils";

function SubscriptionPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get("plan") || "workshop";

  const plan = MOCK_SUBSCRIPTION_PLANS.find((p) => p.slug === planSlug) || MOCK_SUBSCRIPTION_PLANS[2];
  const [paymentMethod, setPaymentMethod] = useState<"ideal" | "paypal" | "tikkie">("ideal");
  const [selectedBank, setSelectedBank] = useState("ING");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      router.push("/onboarding/success");
    }, 800);
  };

  const vatAmount = plan.monthlyPrice * 0.21;
  const totalAmount = plan.monthlyPrice + vatAmount;

  return (
    <ConsumerLayout>
      <div className="max-w-xl mx-auto my-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-[#54D1CA]/10 text-[#54D1CA] flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">
            Betaling & Bevestiging
          </h1>
          <p className="text-xs text-[#B7B7B7]">
            Stap 3 van 3: Kies je gewenste betaalmethode voor de maandelijkse incasso.
          </p>
        </div>

        {/* Order / Subscription Summary */}
        <div className="bg-[#F9F9F9] p-4 rounded-2xl border border-[#EAEAEA] space-y-2">
          <div className="flex items-center justify-between text-sm font-bold text-[#111111]">
            <span>Abonnement {plan.name}</span>
            <span>{formatCurrency(plan.monthlyPrice)} / mnd</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#B7B7B7]">
            <span>21% BTW</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-extrabold text-[#111111] pt-2 border-t border-[#EAEAEA]">
            <span>Totaal Eerste Betaling</span>
            <span className="text-[#FA1EFF]">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Dutch Payment Methods Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-[#111111] block">Betaalmethode Selecteren:</label>

          {/* iDEAL */}
          <div
            onClick={() => setPaymentMethod("ideal")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              paymentMethod === "ideal"
                ? "border-[#FA1EFF] bg-[#FAE2F0]/30 shadow-xs"
                : "border-[#EAEAEA] bg-[#F9F9F9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#CC0066] text-white font-bold text-xs flex items-center justify-center">
                iDEAL
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">iDEAL</span>
                <span className="block text-[11px] text-[#B7B7B7]">Direct & veilig via je eigen Nederlandse bank</span>
              </div>
            </div>
            {paymentMethod === "ideal" && <CheckCircle2 className="w-5 h-5 text-[#FA1EFF]" />}
          </div>

          {/* Bank selector if iDEAL is chosen */}
          {paymentMethod === "ideal" && (
            <div className="pl-4 pr-2 py-2 bg-[#F9F9F9] rounded-xl border border-[#EAEAEA]">
              <label className="text-xs font-bold text-[#111111] block mb-1">Kies je Bank:</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full h-10 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
              >
                <option value="ING">ING Bank</option>
                <option value="Rabobank">Rabobank</option>
                <option value="ABN AMRO">ABN AMRO</option>
                <option value="ASN Bank">ASN Bank</option>
                <option value="Triodos">Triodos Bank</option>
                <option value="SNS">SNS Bank</option>
                <option value="Bunq">Bunq</option>
              </select>
            </div>
          )}

          {/* PayPal */}
          <div
            onClick={() => setPaymentMethod("paypal")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              paymentMethod === "paypal"
                ? "border-[#FA1EFF] bg-[#FAE2F0]/30 shadow-xs"
                : "border-[#EAEAEA] bg-[#F9F9F9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#003087] text-white font-bold text-xs flex items-center justify-center">
                PP
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">PayPal</span>
                <span className="block text-[11px] text-[#B7B7B7]">Aankoopbescherming & automatisch verlengen</span>
              </div>
            </div>
            {paymentMethod === "paypal" && <CheckCircle2 className="w-5 h-5 text-[#FA1EFF]" />}
          </div>

          {/* Tikkie */}
          <div
            onClick={() => setPaymentMethod("tikkie")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              paymentMethod === "tikkie"
                ? "border-[#FA1EFF] bg-[#FAE2F0]/30 shadow-xs"
                : "border-[#EAEAEA] bg-[#F9F9F9]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#30B54A] text-white font-bold text-xs flex items-center justify-center">
                T
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">Tikkie Zakelijk</span>
                <span className="block text-[11px] text-[#B7B7B7]">Betaal via QR-code of WhatsApp link</span>
              </div>
            </div>
            {paymentMethod === "tikkie" && <CheckCircle2 className="w-5 h-5 text-[#FA1EFF]" />}
          </div>
        </div>

        {/* Security badge note */}
        <p className="text-[11px] text-[#B7B7B7] text-center">
          🔒 Je betaling verloopt via een beveiligde SSL-verbinding. Wij slaan nooit je bank- of kaartgegevens op.
        </p>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isProcessing}
          onClick={handlePay}
          className="gap-2 mt-4"
        >
          BEVESTIG & BETAAL {formatCurrency(totalAmount)}
        </Button>
      </div>
    </ConsumerLayout>
  );
}

export default function SubscriptionPaymentPage() {
  return (
    <Suspense fallback={
      <ConsumerLayout>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111111]">Betalingsgegevens laden...</p>
        </div>
      </ConsumerLayout>
    }>
      <SubscriptionPaymentContent />
    </Suspense>
  );
}

