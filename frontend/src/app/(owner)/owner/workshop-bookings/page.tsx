"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ticket, CheckCircle2, Clock, XCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { formatCurrency, formatDate } from "@/lib/utils";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STATUS_BADGE = {
  CONFIRMED: { className: "bg-[#CBF5D5] text-[#3B9B52]", label: "Bevestigd", Icon: CheckCircle2 },
  PENDING: { className: "bg-[#FAE2F0] text-[#790166]", label: "In afwachting", Icon: Clock },
  CANCELLED: { className: "bg-[#F2D9DE] text-[#E54666]", label: "Geannuleerd", Icon: XCircle },
} as const;

export default function OwnerWorkshopBookingsPage() {
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const bookingsRes = useApiResource(
    businessId && `owner-bookings:${businessId}`,
    () => api.getBusinessWorkshopBookings(businessId!)
  );
  // Captured once on mount so render stays pure.
  const [now] = useState(() => Date.now());

  const bookings = bookingsRes.data ?? [];
  const sumTickets = (list: typeof bookings) => list.reduce((n, b) => n + b.ticketQuantity, 0);
  const purchased = sumTickets(bookings.filter((b) => b.status === "CONFIRMED"));
  const cancelled = sumTickets(bookings.filter((b) => b.status === "CANCELLED"));
  const recent = sumTickets(
    bookings.filter((b) => b.status !== "CANCELLED" && now - new Date(b.createdAt).getTime() <= WEEK_MS)
  );

  const isLoading = businessLoading || bookingsRes.loading;
  const loadError = businessError ?? bookingsRes.error;
  const retry = businessError ? reloadBusiness : bookingsRes.reload;

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Workshop Ticketverkopen</h1>
          <p className="text-xs text-[#B7B7B7]">Overzicht van gereserveerde tickets voor je workshops</p>
        </div>

        {/* Ticket Metrics Cards matching Figma 459:915 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#CBF5D5] text-[#3B9B52] space-y-1">
            <span className="text-xs font-bold block">Purchased Tickets</span>
            <span className="text-3xl font-extrabold font-rubik">{isLoading ? "–" : purchased}</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#D9DFF2] text-[#344DB1] space-y-1">
            <span className="text-xs font-bold block">Cancelled Tickets</span>
            <span className="text-3xl font-extrabold font-rubik">{isLoading ? "–" : cancelled}</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#E8D1ED] text-[#C04BDA] space-y-1">
            <span className="text-xs font-bold block">New Tickets Purchased</span>
            <span className="text-3xl font-extrabold font-rubik">{isLoading ? "–" : recent}</span>
          </div>
        </div>

        {/* Bookings Table/List */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-4">
          <h3 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#790166]" /> Recente Boekingen
          </h3>

          {isLoading ? (
            <LoadingState label="Boekingen laden..." />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={retry} />
          ) : !business ? (
            <EmptyState title="Nog geen winkel" description="Maak eerst een winkel aan om workshopboekingen te ontvangen." />
          ) : bookings.length === 0 ? (
            <EmptyState title="Nog geen boekingen" description="Zodra klanten tickets voor je workshops boeken, verschijnen ze hier." />
          ) : (
            <div className="space-y-3">
              {bookings.map((bk) => {
                const badge = STATUS_BADGE[bk.status];
                return (
                  <div key={bk.id} className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#790166]">{bk.workshopTitle}</span>
                      <p className="text-xs font-bold text-[#111111] mt-0.5">{bk.consumerName || "Klant"} ({bk.ticketQuantity} tickets)</p>
                      <span className="text-[11px] text-[#B7B7B7]">{formatDate(bk.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <span className="text-sm font-extrabold text-[#111111]">{formatCurrency(bk.totalAmount)}</span>
                      <span className={`px-3 py-1 ${badge.className} text-xs font-bold rounded-full flex items-center gap-1`}>
                        <badge.Icon className="w-3.5 h-3.5" /> {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
