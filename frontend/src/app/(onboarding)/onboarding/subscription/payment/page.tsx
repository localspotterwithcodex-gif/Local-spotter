"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

function SubscriptionPaymentContent() {
  const router = useRouter();
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get("plan") || "workshop";

  const plansRes = useApiResource("subscription-plans", () => api.getSubscriptionPlans());
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const plan = plansRes.data?.find((p) => p.slug === planSlug);
  const [paymentMethod, setPaymentMethod] = useState<"ideal" | "paypal" | "tikkie">("ideal");
  const [selectedBank, setSelectedBank] = useState("ING");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  if (plansRes.loading || businessLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label={t("onb.pay.loading")} />
      </ConsumerLayout>
    );
  }
  const loadError = plansRes.error ?? businessError;
  if (loadError) {
    return (
      <ConsumerLayout>
        <ErrorState message={loadError} onRetry={plansRes.error ? plansRes.reload : reloadBusiness} />
      </ConsumerLayout>
    );
  }
  if (!plan) {
    return (
      <ConsumerLayout>
        <EmptyState
          title={t("onb.pay.planNotFoundTitle")}
          description={t("onb.pay.planNotFoundDesc")}
          actionLabel={t("onb.pay.backToPlans")}
          onAction={() => router.push("/onboarding/subscription")}
        />
      </ConsumerLayout>
    );
  }
  if (!business) {
    return (
      <ConsumerLayout>
        <EmptyState
          title={t("onb.pay.noShopTitle")}
          description={t("onb.pay.noShopDesc")}
          actionLabel={t("onb.pay.fillShop")}
          onAction={() => router.push("/onboarding/business")}
        />
      </ConsumerLayout>
    );
  }

  const handlePay = async () => {
    setError("");
    setIsProcessing(true);
    try {
      // No payment provider is connected yet: this registers the chosen plan.
      // The backend activates it only when payment is not required (non-production).
      await api.selectPlan(business.id, plan.slug);
      router.push("/onboarding/success");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setIsProcessing(false);
    }
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
            {t("onb.pay.title")}
          </h1>
          <p className="text-xs text-[#B7B7B7]">
            {t("onb.pay.subtitle")}
          </p>
        </div>

        {/* Order / Subscription Summary */}
        <div className="bg-[#F9F9F9] p-4 rounded-2xl border border-[#EAEAEA] space-y-2">
          <div className="flex items-center justify-between text-sm font-bold text-[#111111]">
            <span>{t("onb.pay.subscription", { plan: plan.name })}</span>
            <span>{t("onb.pay.perMonthShort", { price: f.currency(plan.monthlyPrice) })}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#B7B7B7]">
            <span>{t("onb.pay.vat")}</span>
            <span>{f.currency(vatAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-extrabold text-[#111111] pt-2 border-t border-[#EAEAEA]">
            <span>{t("onb.pay.firstTotal")}</span>
            <span className="text-[#FA1EFF]">{f.currency(totalAmount)}</span>
          </div>
        </div>

        {/* Dutch Payment Methods Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-[#111111] block">{t("onb.pay.selectMethod")}</label>

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
                <span className="block text-[11px] text-[#B7B7B7]">{t("onb.pay.idealDesc")}</span>
              </div>
            </div>
            {paymentMethod === "ideal" && <CheckCircle2 className="w-5 h-5 text-[#FA1EFF]" />}
          </div>

          {/* Bank selector if iDEAL is chosen */}
          {paymentMethod === "ideal" && (
            <div className="pl-4 pr-2 py-2 bg-[#F9F9F9] rounded-xl border border-[#EAEAEA]">
              <label className="text-xs font-bold text-[#111111] block mb-1">{t("onb.pay.chooseBank")}</label>
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
                <span className="block text-[11px] text-[#B7B7B7]">{t("onb.pay.paypalDesc")}</span>
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
                <span className="block text-[11px] text-[#B7B7B7]">{t("onb.pay.tikkieDesc")}</span>
              </div>
            </div>
            {paymentMethod === "tikkie" && <CheckCircle2 className="w-5 h-5 text-[#FA1EFF]" />}
          </div>
        </div>

        {/* Honest payment status note (no payment provider connected yet, decision D-004) */}
        <p className="text-[11px] text-[#B7B7B7] text-center">
          {t("onb.pay.notAvailable")}
        </p>

        {error && (
          <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isProcessing}
          onClick={handlePay}
          className="gap-2 mt-4"
        >
          {t("onb.pay.confirmPlan", { plan: plan.name.toUpperCase() })}
        </Button>
      </div>
    </ConsumerLayout>
  );
}

export default function SubscriptionPaymentPage() {
  const { t } = useLocale();
  return (
    <Suspense fallback={
      <ConsumerLayout>
        <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111111]">{t("onb.pay.loading")}</p>
        </div>
      </ConsumerLayout>
    }>
      <SubscriptionPaymentContent />
    </Suspense>
  );
}

