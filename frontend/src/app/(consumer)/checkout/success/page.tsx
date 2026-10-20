"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag, Truck, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { PAID_STATES } from "@/types/order";
import { GuestClaimCard } from "@/features/guest/GuestClaimCard";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

function CheckoutSuccessContent() {
  const { t } = useLocale();
  const f = useFormat();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { data: order, error, loading, reload } = useApiResource(orderId ? `order:${orderId}` : null, async () => {
    const found = await api.getOrderById(orderId as string);
    if (!found) throw new ApiError("Order not found", 404, null);
    return found;
  });

  if (!orderId) {
    return (
      <div className="max-w-2xl mx-auto my-6 sm:my-10">
        <EmptyState
          title={t("checkout.success.noOrderTitle")}
          description={t("checkout.success.noOrderDesc")}
        />
      </div>
    );
  }
  if (loading) return <LoadingState label={t("checkout.success.loading")} />;
  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto my-6 sm:my-10">
        <ErrorState title={t("checkout.success.unavailable")} message={error} onRetry={reload} />
      </div>
    );
  }

  const { items, subtotal, deliveryFee: shipping, total, orderNumber, deliveryAddress } = order;
  const paid = PAID_STATES.includes(order.paymentStatus);
  const pickup = order.fulfilmentMethod === "PICKUP";

  return (
    <div className="max-w-2xl mx-auto my-6 sm:my-10 space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 bg-[#FAE2F0] text-[#FA1EFF] rounded-full text-xs font-bold font-manrope">
            {t("checkout.success.received")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-rubik text-[#111111]">
            {t("checkout.success.thanks")}
          </h1>
          <p className="text-xs text-[#B7B7B7]">
            {t("checkout.success.orderNumber")}: <span className="font-bold text-[#111111]">{orderNumber}</span>
          </p>
        </div>

        <p className="text-sm text-[#111111] max-w-md mx-auto">
          {t("checkout.success.placedAt", { name: order.businessName })}
        </p>

        {/* Estimated Delivery Badge */}
        <div className="flex items-center justify-center gap-2 p-3 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] max-w-md mx-auto text-xs text-[#111111] font-bold">
          <Truck className="w-4 h-4 text-[#FA1EFF]" />
          <span>{t("checkout.success.awaiting", { name: order.businessName })}</span>
        </div>
      </div>

      <GuestClaimCard />

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
        <h2 className="text-lg font-bold font-rubik text-[#111111] border-b border-[#EAEAEA] pb-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#FA1EFF]" />
          {t("checkout.success.summary")}
        </h2>

        {/* Product Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-[#EAEAEA] last:border-b-0 last:pb-0">
              <div className="w-16 h-16 rounded-xl bg-[#F9F9F9] border border-[#EAEAEA] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-[#B7B7B7]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#111111] truncate">{item.productName}</h3>
                <p className="text-xs text-[#B7B7B7]">
                  {item.variantSize ? `${item.variantSize} • ` : ""}{t("checkout.success.quantity", { n: item.quantity })}
                </p>
                <span className="text-xs font-bold text-[#FA1EFF] block mt-1">
                  {f.currency(item.totalPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="bg-[#F9F9F9] p-4 rounded-2xl border border-[#EAEAEA] space-y-2 text-xs">
          <div className="flex justify-between text-[#111111]">
            <span>{t("cart.subtotal")}:</span>
            <span className="font-bold">{f.currency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#111111]">
            <span>{t("cart.delivery")}:</span>
            <span className="font-bold">{f.currency(shipping)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-[#111111] pt-2 border-t border-[#EAEAEA]">
            <span>{t("common.total")}:</span>
            <span className="text-[#FA1EFF]">{f.currency(total)}</span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-1">
            <span className="font-bold text-[#111111] flex items-center gap-1 mb-1">
              <MapPin className="w-4 h-4 text-[#FA1EFF]" /> {t(`checkout.fulfilment.${order.fulfilmentMethod}` as never)}
            </span>
            {pickup ? (
              <p className="text-[#B7B7B7]">{t("checkout.success.pickupAt", { name: order.businessName })}</p>
            ) : (
              <>
                <p className="text-[#B7B7B7]">{deliveryAddress.street} {deliveryAddress.houseNumber}</p>
                <p className="text-[#B7B7B7]">{deliveryAddress.postalCode} {deliveryAddress.city}</p>
              </>
            )}
          </div>

          <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-1">
            <span className="font-bold text-[#111111] flex items-center gap-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#54D1CA]" /> {t("checkout.paymentMethod")}
            </span>
            <p className="text-[#111111] font-medium">{paid ? t("checkout.success.paymentDone") : t("checkout.success.paymentPending")}</p>
            {!paid && <p className="text-[#B7B7B7]">{t("checkout.success.paymentOpen")}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/account/orders" className="flex-1">
            <Button variant="secondary" fullWidth className="h-12">
              {t("checkout.success.viewOrders")}
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="primary" fullWidth className="h-12 gap-2">
              {t("checkout.success.continueShopping")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SuccessFallback() {
  const { t } = useLocale();
  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
      <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm font-medium text-[#111111]">{t("checkout.success.loading")}</p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <ConsumerLayout>
      <Suspense fallback={<SuccessFallback />}>
        <CheckoutSuccessContent />
      </Suspense>
    </ConsumerLayout>
  );
}
