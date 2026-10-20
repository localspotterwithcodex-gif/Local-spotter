"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api, type PaymentInfo } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { PAID_STATES } from "@/types/order";
import { GuestClaimCard } from "@/features/guest/GuestClaimCard";

const POLL_MS = 3000;
const MAX_POLLS = 20;

/** Where to go after a payment, by what was paid. */
function targets(p: PaymentInfo): { viewHref: string; viewKey: "payment.return.viewOrders" | "payment.return.viewBookings" | "payment.return.viewSubscription" } {
  if (p.purpose === "WORKSHOP_BOOKING") return { viewHref: "/workshops", viewKey: "payment.return.viewBookings" };
  if (p.purpose === "BUSINESS_SUBSCRIPTION") return { viewHref: "/owner/subscription", viewKey: "payment.return.viewSubscription" };
  return { viewHref: "/account/orders", viewKey: "payment.return.viewOrders" };
}

function relatedId(p: PaymentInfo): string | null {
  if (p.purpose === "WORKSHOP_BOOKING") return p.workshopBookingId ?? null;
  if (p.purpose === "BUSINESS_SUBSCRIPTION") return p.businessSubscriptionId ?? null;
  return p.customerOrderId ?? p.orderId ?? null;
}

function PaymentReturnContent() {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const paymentId = useSearchParams().get("payment");
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const open = payment !== null && (payment.status === "PENDING" || payment.status === "AUTHORIZED");

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    // First read immediately, then keep polling while the provider has not settled the payment.
    const timer = setTimeout(
      () => {
        api.getPayment(paymentId).then(
          (p) => {
            if (cancelled) return;
            setPayment(p);
            setLoadError(null);
            setPolls((n) => n + 1);
          },
          (err: unknown) => {
            if (cancelled) return;
            setLoadError(errMsg(err));
          }
        );
      },
      payment === null ? 0 : POLL_MS
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Re-arm after every successful read while the payment is open and we are under the cap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, polls, open && polls < MAX_POLLS]);

  const retry = useCallback(async () => {
    if (!payment) return;
    const id = relatedId(payment);
    if (!id) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const intent = await api.createPaymentIntent({ purpose: payment.purpose, relatedEntityId: id });
      window.location.assign(intent.checkoutUrl ?? `/payment/return?payment=${encodeURIComponent(intent.paymentId)}`);
    } catch (err) {
      setRetryError(errMsg(err));
      setRetrying(false);
    }
  }, [payment, errMsg]);

  if (!paymentId) {
    return (
      <div className="max-w-md mx-auto my-10">
        <EmptyState title={t("payment.return.noPaymentTitle")} description={t("payment.return.noPaymentDesc")} />
      </div>
    );
  }
  if (loadError && !payment) {
    return (
      <div className="max-w-md mx-auto my-10">
        <ErrorState title={t("payment.return.unavailable")} message={loadError} onRetry={() => setPolls((n) => n + 1)} />
      </div>
    );
  }
  if (!payment) return <LoadingState label={t("payment.return.checking")} />;

  const { viewHref, viewKey } = targets(payment);
  const paid = PAID_STATES.includes(payment.status);
  const waiting = open;
  const amount = Number(payment.amount);

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md text-center space-y-4" aria-live="polite">
        {paid ? (
          <div className="w-16 h-16 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        ) : waiting ? (
          <div className="w-16 h-16 rounded-full bg-[#F0E9DF] text-[#E8A74A] flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#F2D9DE] text-[#ED4C5C] flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10" />
          </div>
        )}

        <h1 className="text-xl sm:text-2xl font-bold font-rubik text-[#111111]">
          {paid
            ? t("payment.return.paidTitle")
            : waiting
              ? t(polls >= MAX_POLLS ? "payment.return.slowTitle" : "payment.return.pendingTitle")
              : t("payment.return.failedTitle")}
        </h1>
        <p className="text-sm text-[#555555]">
          {paid
            ? t("payment.return.paidDesc", { amount: f.currency(amount) })
            : waiting
              ? t(polls >= MAX_POLLS ? "payment.return.slowDesc" : "payment.return.pendingDesc")
              : t("payment.return.failedDesc")}
        </p>

        {retryError && (
          <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
            {retryError}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {!paid && !waiting && relatedId(payment) && (
            <Button variant="primary" fullWidth className="h-12" isLoading={retrying} onClick={() => void retry()}>
              {t("payment.return.tryAgain")}
            </Button>
          )}
          {waiting && polls >= MAX_POLLS && (
            <Button variant="secondary" fullWidth className="h-12" onClick={() => setPolls(0)}>
              {t("payment.return.checkAgain")}
            </Button>
          )}
          <Link href={viewHref}>
            <Button variant={paid ? "primary" : "secondary"} fullWidth className="h-12">
              {t(viewKey)}
            </Button>
          </Link>
        </div>
      </div>
      {paid && payment.purpose === "PRODUCT_ORDER" && (
        <div className="mt-4">
          <GuestClaimCard />
        </div>
      )}
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <ConsumerLayout>
      <Suspense fallback={<LoadingState label="…" />}>
        <PaymentReturnContent />
      </Suspense>
    </ConsumerLayout>
  );
}
