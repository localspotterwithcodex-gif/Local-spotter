"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, MapPin, Store, Truck, PackageCheck } from "lucide-react";
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
import { useAuth } from "@/features/auth/AuthContext";
import { GuestContactStep } from "@/features/checkout/GuestContactStep";
import { geocodeFirst } from "@/lib/geocode";
import type { FulfilmentOptions } from "@/lib/api";
import type { FulfilmentMethod } from "@/types/order";

const METHOD_ORDER: FulfilmentMethod[] = ["SHIPPING", "LOCAL_DELIVERY", "PICKUP"];

function enabledMethods(o: FulfilmentOptions): FulfilmentMethod[] {
  return METHOD_ORDER.filter((m) =>
    m === "PICKUP" ? o.pickup.enabled : m === "SHIPPING" ? o.shipping.enabled : o.localDelivery.enabled
  );
}

function feeOf(o: FulfilmentOptions, m: FulfilmentMethod): number {
  return m === "PICKUP" ? 0 : m === "SHIPPING" ? o.shipping.fee : o.localDelivery.fee;
}

/** Splits "Keizersgracht 412-B" into street and house number (house number is optional). */

export default function CheckoutPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const { items, groups, subtotal, isLoading: cartLoading, error: cartError, reload: reloadCart, isAnonymous, mergeFailed } = useCart();
  const { user } = useAuth();
  // Guests have no saved profile or addresses; only signed-in members load them.
  const isMember = !isAnonymous && user?.isGuest !== true;
  const profile = useApiResource(isMember ? "consumer-profile" : null, () => api.getConsumerProfile());

  // null = untouched, so the field shows the profile value without an effect.
  const [fullNameInput, setFullNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const addresses = useApiResource(isMember ? "consumer-addresses" : null, () => api.getAddresses());
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Set once the order exists; a failed payment start is then retried without creating a second order. */
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, FulfilmentMethod>>({});

  const methodFor = (g: (typeof groups)[number]): FulfilmentMethod | undefined => {
    const available = enabledMethods(g.fulfilmentOptions);
    const chosen = picked[g.business.id];
    return chosen && available.includes(chosen) ? chosen : available[0];
  };

  const fees = groups.map((g) => {
    const m = methodFor(g);
    return m ? feeOf(g.fulfilmentOptions, m) : 0;
  });
  const deliveryTotal = fees.reduce((a, b) => a + b, 0);
  const total = subtotal + deliveryTotal;
  const needsAddress = groups.some((g) => {
    const m = methodFor(g);
    return m !== undefined && m !== "PICKUP";
  });
  const blocked = groups.some((g) => methodFor(g) === undefined);

  const startPayment = async (orderCheckoutId: string) => {
    const intent = await api.createPaymentIntent({ purpose: "PRODUCT_ORDER", relatedEntityId: orderCheckoutId });
    if (!intent.checkoutUrl) {
      router.push(`/payment/return?payment=${encodeURIComponent(intent.paymentId)}`);
      return;
    }
    window.location.assign(intent.checkoutUrl);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    setIsProcessing(true);
    setSubmitError(null);
    try {
      let id = checkoutId;
      if (!id) {
        let deliveryAddress;
        if (needsAddress) {
          const { street: streetName, houseNumber } = splitStreet(street);
          const wantsRadius = groups.some(
            (g) => methodFor(g) === "LOCAL_DELIVERY" && (g.fulfilmentOptions.localDelivery.radiusKm ?? 0) > 0
          );
          const coords = wantsRadius
            ? await geocodeFirst([`${street}, ${postalCode} ${city}, NL`, `${postalCode} ${city}, NL`], locale)
            : null;
          deliveryAddress = {
            street: streetName,
            houseNumber,
            city: city.trim(),
            postalCode: postalCode.trim() || undefined,
            country: "NL",
            notes: [fullName && `Ontvanger: ${fullName}`, phone && `Tel: ${phone}`].filter(Boolean).join(", ") || undefined,
            ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
          };
        }
        const order = await api.createOrder({
          deliveryAddress,
          fulfilments: groups.map((g) => ({ businessId: g.business.id, method: methodFor(g) as FulfilmentMethod })),
        });
        id = order.id;
        setCheckoutId(id);
        reloadCart();
      }
      await startPayment(id);
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

  if (items.length === 0 && !isProcessing && !checkoutId) {
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

  if (isAnonymous) {
    return (
      <ConsumerLayout>
        <GuestContactStep
          onStarted={(contact) => {
            setFullNameInput(contact.name);
            setPhoneInput(contact.phone);
          }}
        />
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

        {mergeFailed.length > 0 && (
          <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
            {t("cart.mergeFailed", { names: mergeFailed.join(", ") })}
          </div>
        )}

        <form onSubmit={handleOrderSubmit} className="space-y-6">
          {/* Fulfilment per store */}
          {groups.map((g) => {
            const available = enabledMethods(g.fulfilmentOptions);
            const current = methodFor(g);
            return (
              <div key={g.business.id} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
                <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#FA1EFF]" /> {g.business.name}
                  <span className="ml-auto text-xs font-bold text-[#555555]">{f.currency(g.subtotal)}</span>
                </h3>
                <p className="text-[11px] text-[#B7B7B7]">{t("checkout.fulfilment.title")}</p>
                {available.length === 0 ? (
                  <p role="alert" className="text-xs text-[#ED4C5C]">{t("checkout.fulfilment.none")}</p>
                ) : (
                  <div role="radiogroup" aria-label={g.business.name} className="space-y-2">
                    {available.map((m) => {
                      const fee = feeOf(g.fulfilmentOptions, m);
                      const hint =
                        m === "SHIPPING" && g.fulfilmentOptions.shipping.freeAbove
                          ? t("checkout.fulfilment.freeAbove", { amount: f.currency(g.fulfilmentOptions.shipping.freeAbove) })
                          : m === "LOCAL_DELIVERY" && g.fulfilmentOptions.localDelivery.radiusKm
                            ? t("checkout.fulfilment.radius", { km: g.fulfilmentOptions.localDelivery.radiusKm })
                            : m === "LOCAL_DELIVERY"
                              ? t("checkout.fulfilment.sameCity", { city: g.business.city ?? "" })
                              : null;
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={current === m}
                          key={m}
                          disabled={isProcessing || !!checkoutId}
                          onClick={() => setPicked((prev) => ({ ...prev, [g.business.id]: m }))}
                          className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                            current === m ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {m === "PICKUP" ? <PackageCheck className="w-4 h-4 text-[#54D1CA]" /> : <Truck className="w-4 h-4 text-[#54D1CA]" />}
                            <span className="min-w-0">
                              <span className="text-xs font-bold text-[#111111] block">{t(`checkout.fulfilment.${m}` as never)}</span>
                              {hint && <span className="text-[11px] text-[#B7B7B7] block">{hint}</span>}
                            </span>
                          </span>
                          <span className="text-xs font-bold text-[#111111] shrink-0">
                            {fee === 0 ? t("checkout.fulfilment.free") : f.currency(fee)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bezorgadres Form */}
          {needsAddress && (
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
          )}

          {/* Betaling */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-2">
            <h3 className="text-sm font-bold font-rubik text-[#111111]">{t("checkout.paymentMethod")}</h3>
            <p className="text-[11px] text-[#B7B7B7]">{t("checkout.payNotice")}</p>
          </div>

          {/* Totaal & Submit */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            {groups.length > 0 && (
              <p className="text-xs text-[#555555]">
                {t("checkout.orderFrom")}{" "}
                <span className="font-bold text-[#111111]">{groups.map((g) => g.business.name).join(", ")}</span>
              </p>
            )}
            <div className="flex justify-between text-xs text-[#555555]">
              <span>{t("cart.subtotal")}</span>
              <span className="font-bold text-[#111111]">{f.currency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-[#555555]">
              <span>{t("cart.delivery")}</span>
              <span className="font-bold text-[#111111]">{f.currency(deliveryTotal)}</span>
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
              disabled={blocked}
              className="gap-2"
            >
              {checkoutId ? t("checkout.retryPayment", { total: f.currency(total) }) : t("checkout.payAndOrder", { total: f.currency(total) })}
            </Button>
          </div>
        </form>
      </div>
    </ConsumerLayout>
  );
}
