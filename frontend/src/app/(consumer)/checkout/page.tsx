"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, MapPin, CheckCircle2 } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { api } from "@/lib/api";
import { useCart } from "@/features/cart/CartContext";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { joinStreet, splitStreet } from "@/lib/address";

/** Splits "Keizersgracht 412-B" into street and house number (house number is optional). */

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const { items, business, subtotal, deliveryFee, isLoading: cartLoading, error: cartError, reload: reloadCart } = useCart();
  const profile = useApiResource("consumer-profile", () => api.getConsumerProfile());

  // null = untouched, so the field shows the profile value without an effect.
  const [fullNameInput, setFullNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const addresses = useApiResource("consumer-addresses", () => api.getAddresses());
  const saved = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
  const [streetInput, setStreetInput] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState<string | null>(null);
  const [postalCodeInput, setPostalCodeInput] = useState<string | null>(null);
  const street = streetInput ?? (saved ? joinStreet(saved.street, saved.houseNumber) : "");
  const city = cityInput ?? saved?.city ?? "";
  const postalCode = postalCodeInput ?? saved?.postalCode ?? "";
  const setStreet = setStreetInput;
  const setCity = setCityInput;
  const setPostalCode = setPostalCodeInput;
  const fullName = fullNameInput ?? saved?.fullName ?? profile.data?.displayName ?? "";
  const phone = phoneInput ?? saved?.phone ?? profile.data?.phone ?? "";

  const [paymentMethod, setPaymentMethod] = useState<"ideal" | "paypal" | "tikkie">("ideal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = subtotal + deliveryFee;

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setSubmitError(null);
    try {
      const { street: streetName, houseNumber } = splitStreet(street);
      const order = await api.createOrder({
        street: streetName,
        houseNumber,
        city: city.trim(),
        postalCode: postalCode.trim() || undefined,
        country: "NL",
        notes: [fullName && `Ontvanger: ${fullName}`, phone && `Tel: ${phone}`].filter(Boolean).join(", ") || undefined,
      });
      reloadCart();
      router.push(`/checkout/success?orderId=${encodeURIComponent(order.id)}`);
    } catch (err) {
      setSubmitError(errMsg(err));
      setIsProcessing(false);
    }
  };

  if (cartLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label={t("checkout.preparing")} />
      </ConsumerLayout>
    );
  }

  if (cartError) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("cart.unavailable")} message={cartError} onRetry={reloadCart} />
      </ConsumerLayout>
    );
  }

  if (items.length === 0 && !isProcessing) {
    return (
      <ConsumerLayout>
        <div className="max-w-xl mx-auto">
          <EmptyState
            title={t("cart.emptyTitle")}
            description={t("checkout.emptyDesc")}
            actionLabel={t("cart.browseProducts")}
            onAction={() => router.push("/products")}
          />
        </div>
      </ConsumerLayout>
    );
  }

  return (
    <ConsumerLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">{t("checkout.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("checkout.subtitle")}</p>
        </div>

        <form onSubmit={handleOrderSubmit} className="space-y-6">
          {/* Bezorgadres Form */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
            <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#54D1CA]" /> {t("checkout.deliveryAddress")}
            </h3>

            <Input
              label={t("checkout.recipientName")}
              value={fullName}
              onChange={(e) => setFullNameInput(e.target.value)}
              required
            />

            <Input
              label={t("checkout.street")}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("checkout.postalCode")}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
              <Input
                label={t("checkout.city")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <Input
              label={t("checkout.phone")}
              value={phone}
              onChange={(e) => setPhoneInput(e.target.value)}
              required
            />
            {profile.error && (
              <p className="text-[11px] text-[#ED4C5C]">{t("checkout.profileLoadFailed")}</p>
            )}
          </div>

          {/* Betaalmethode */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <h3 className="text-sm font-bold font-rubik text-[#111111]">{t("checkout.paymentMethod")}</h3>

            <div
              onClick={() => setPaymentMethod("ideal")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "ideal" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">iDEAL</span>
              {paymentMethod === "ideal" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>

            <div
              onClick={() => setPaymentMethod("tikkie")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "tikkie" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">Tikkie</span>
              {paymentMethod === "tikkie" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>

            <div
              onClick={() => setPaymentMethod("paypal")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "paypal" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">PayPal</span>
              {paymentMethod === "paypal" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>

            <p className="text-[11px] text-[#B7B7B7]">
              {t("checkout.paymentNotice")}
            </p>
          </div>

          {/* Totaal & Submit */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            {business && <p className="text-xs text-[#555555]">{t("checkout.orderFrom")} <span className="font-bold text-[#111111]">{business.name}</span></p>}
            <div className="flex justify-between text-xs text-[#555555]">
              <span>{t("cart.subtotal")}</span>
              <span className="font-bold text-[#111111]">{f.currency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-[#555555]">
              <span>{t("cart.delivery")}</span>
              <span className="font-bold text-[#111111]">{f.currency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#111111]">
              <span>{t("checkout.totalDue")}</span>
              <span className="text-[#FA1EFF]">{f.currency(total)}</span>
            </div>

            {submitError && (
              <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              className="gap-2"
            >
              {t("checkout.placeOrder", { total: f.currency(total) })}
            </Button>
          </div>
        </form>
      </div>
    </ConsumerLayout>
  );
}
