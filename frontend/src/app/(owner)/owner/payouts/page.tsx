"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { PayoutAccountCard } from "@/features/payouts/PayoutAccountCard";

const ENTRY_TYPES = ["SALE", "COMMISSION", "COMMISSION_REVERSAL", "REFUND", "REFUND_PENDING", "PAYOUT", "PAYOUT_REVERSAL"];
const PAYOUT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID", "FAILED"];

export default function OwnerPayoutsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const balanceRes = useApiResource(businessId && `owner-balance:${businessId}`, () => api.getBusinessBalance(businessId!));
  const eur = (cents: number) => f.currency(cents / 100);

  const header = (
    <>
      <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
        <ArrowLeft className="w-4 h-4" />
        {t("ownerx.backToDashboard")}
      </Link>
      <div>
        <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.payouts.title")}</h1>
        <p className="text-xs text-[#B7B7B7]">{t("ownerx.payouts.subtitle")}</p>
      </div>
    </>
  );

  const wrap = (body: React.ReactNode) => (
    <OwnerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {header}
        {body}
      </div>
    </OwnerLayout>
  );

  if (businessLoading || balanceRes.loading) return wrap(<LoadingState label={t("manage.payouts.loading")} />);
  const loadError = businessError ?? balanceRes.error;
  if (loadError) return wrap(<ErrorState message={loadError} onRetry={businessError ? reloadBusiness : balanceRes.reload} />);
  if (!business) return wrap(<EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forSubscription")} />);
  const b = balanceRes.data;
  if (!b) return wrap(<EmptyState title={t("manage.payouts.entriesEmpty")} description="" />);

  const stats: Array<[string, number]> = [
    [t("manage.payouts.gross"), b.grossSalesCents],
    [t("manage.payouts.refunds"), b.refundsCents],
    [t("payoutsx.commission"), b.commissionCents],
    [t("manage.payouts.net"), b.netSalesCents],
    [t("payoutsx.onHold"), b.onHoldCents],
    [t("manage.payouts.paidOut"), b.paidOutCents],
    [t("manage.payouts.pending"), b.pendingPayoutCents],
  ];

  return wrap(
    <>
      <div className="bg-[#FAE2F0] rounded-3xl p-6">
        <p className="text-xs font-bold text-[#790166]">{t("manage.payouts.available")}</p>
        <p className="text-3xl font-extrabold font-rubik text-[#111111]">{eur(b.availableCents)}</p>
        {b.nextReleaseAt && <p className="text-[11px] text-[#790166] mt-1">{t("payoutsx.nextRelease", { date: f.date(b.nextReleaseAt) })}</p>}
      </div>

      {businessId && <PayoutAccountCard businessId={businessId} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([label, cents]) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EAEAEA] p-4">
            <p className="text-[11px] text-[#B7B7B7] font-bold">{label}</p>
            <p className="text-base font-bold text-[#111111]">{eur(cents)}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#B7B7B7]">{t("manage.payouts.note")}</p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("manage.payouts.entriesTitle")}</h2>
        {b.recentEntries.length === 0 ? (
          <p className="text-xs text-[#B7B7B7]">{t("manage.payouts.entriesEmpty")}</p>
        ) : (
          <ul className="bg-white rounded-2xl border border-[#EAEAEA] divide-y divide-[#F4F4F4]">
            {b.recentEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-[#111111] truncate">
                    {t(ENTRY_TYPES.includes(e.type) ? (`payoutsx.type.${e.type}` as "payoutsx.type.SALE") : "manage.payouts.type.other")}
                    {e.orderNumber ? ` · ${e.orderNumber}` : e.workshopTitle ? ` · ${e.workshopTitle}` : ""}
                  </p>
                  <p className="text-[#B7B7B7]">{f.dateTime(e.createdAt)}</p>
                </div>
                <span className={`font-bold shrink-0 ${e.amountCents < 0 ? "text-[#E54666]" : "text-[#3B9B52]"}`}>{eur(e.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("manage.payouts.historyTitle")}</h2>
        {b.payouts.length === 0 ? (
          <p className="text-xs text-[#B7B7B7]">{t("manage.payouts.historyEmpty")}</p>
        ) : (
          <ul className="bg-white rounded-2xl border border-[#EAEAEA] divide-y divide-[#F4F4F4]">
            {b.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div>
                  <p className="font-bold text-[#111111]">{eur(p.amountCents)}</p>
                  <p className="text-[#B7B7B7]">{f.date(p.paidAt ?? p.requestedAt)}</p>
                </div>
                <span className="font-bold text-[#790166]">
                  {p.periodKey ? `${p.periodKey} · ` : ""}
                  {PAYOUT_STATUSES.includes(p.status) ? t(`manage.payouts.status.${p.status}` as "manage.payouts.status.PAID") : p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>,
  );
}
