"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store, CreditCard } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { PAID_STATES, type Order } from "@/types/order";
import { GuestClaimCard } from "@/features/guest/GuestClaimCard";
import { OrderReturns } from "@/features/returns/OrderReturns";

export default function ConsumerOrdersPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading: isLoading, reload } = useApiResource("my-orders", () => api.getMyOrders());
  const orders = data ?? [];
  const returnsRes = useApiResource("my-returns", () => api.getMyReturns());
  const errMsg = useErrorMessage();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOpen = (o: Order) => o.status !== "CANCELLED" && o.status !== "REJECTED" && o.status !== "DELIVERED";
  const needsPayment = (o: Order) => isOpen(o) && !PAID_STATES.includes(o.paymentStatus);
  const canCancel = (o: Order) => o.status === "PENDING" || o.status === "CONFIRMED";

  const pay = async (o: Order) => {
    setBusyId(o.id);
    setActionError(null);
    try {
      const intent = await api.createPaymentIntent({ purpose: "PRODUCT_ORDER", relatedEntityId: o.customerOrder?.id ?? o.id });
      window.location.assign(intent.checkoutUrl ?? `/payment/return?payment=${encodeURIComponent(intent.paymentId)}`);
    } catch (err) {
      setActionError(errMsg(err));
      setBusyId(null);
    }
  };

  const cancel = async (o: Order) => {
    setBusyId(o.id);
    setActionError(null);
    try {
      await api.cancelOrder(o.id);
      setConfirmCancelId(null);
      reload();
    } catch (err) {
      setActionError(errMsg(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/account" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("account.myOrders")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("account.ordersSubtitle")}</p>
        </div>

        <GuestClaimCard />

        {actionError && (
          <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <LoadingState label={t("account.ordersLoading")} />
        ) : error ? (
          <ErrorState title={t("account.ordersUnavailable")} message={error} onRetry={reload} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={t("account.ordersEmptyTitle")}
            description={t("account.ordersEmptyDesc")}
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#F9F9F9]">
                  <div>
                    <span className="text-xs font-bold text-[#111111]">{order.orderNumber}</span>
                    <span className="text-[11px] text-[#B7B7B7] block">{f.date(order.createdAt)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge status={order.status} fulfilment={order.fulfilmentMethod} />
                    {needsPayment(order) && <Badge variant="new">{t("orders.awaitingPayment")}</Badge>}
                  </div>
                </div>

                {/* Business Info */}
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#FA1EFF]" />
                  <span className="text-xs font-bold text-[#111111]">{order.businessName}</span>
                </div>

                <p className="text-[11px] text-[#B7B7B7]">{t(`checkout.fulfilment.${order.fulfilmentMethod}` as never)}</p>

                {/* Items Summary */}
                <div className="space-y-2 pt-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-[#555555]">
                        {item.quantity}x {item.productName} {item.variantSize ? `(${item.variantSize})` : ""}
                      </span>
                      <span className="font-bold text-[#111111]">{f.currency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F9F9F9] text-xs">
                  <span className="text-[#B7B7B7]">{t("account.orderTotal")}</span>
                  <span className="text-sm font-extrabold text-[#111111]">{f.currency(order.total)}</span>
                </div>

                <OrderReturns order={order} returns={(returnsRes.data ?? []).filter((r) => r.orderId === order.id)} onChanged={returnsRes.reload} />

                {(needsPayment(order) || canCancel(order)) && (
                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    {needsPayment(order) && (
                      <Button variant="primary" size="sm" className="gap-1.5" isLoading={busyId === order.id} disabled={busyId !== null} onClick={() => void pay(order)}>
                        <CreditCard className="w-3.5 h-3.5" /> {t("orders.payNow")}
                      </Button>
                    )}
                    {canCancel(order) &&
                      (confirmCancelId === order.id ? (
                        <>
                          <Button variant="outline" size="sm" disabled={busyId !== null} onClick={() => setConfirmCancelId(null)}>
                            {t("orders.keep")}
                          </Button>
                          <Button variant="secondary" size="sm" isLoading={busyId === order.id} disabled={busyId !== null} onClick={() => void cancel(order)}>
                            {t("orders.confirmCancel")}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" disabled={busyId !== null} onClick={() => setConfirmCancelId(order.id)}>
                          {t("orders.cancel")}
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
