"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Clock, MapPin, Users, Calendar as CalendarIcon, Store, Check, ArrowLeft, Info } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useAuth } from "@/features/auth/AuthContext";

export default function WorkshopDetailPage({ params }: { params: Promise<{ workshopId: string }> }) {
  const { workshopId } = use(params);
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();

  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const { data: workshop, error, loading: isLoading, reload } = useApiResource(`workshop:${workshopId}`, () =>
    api.getWorkshopById(workshopId)
  );
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ageOk, setAgeOk] = useState(false);

  const sessions = (workshop?.sessions ?? []).filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED");
  const selected = sessions.find((s) => s.id === sessionId) ?? (sessions.length === 1 ? sessions[0] : null);

  const handleBooking = async () => {
    if (!workshop) return;
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (sessions.length > 1 && !selected) {
      setBookingError(t("workshops.detail.pickSession"));
      return;
    }
    if (workshop.minAge && !ageOk) {
      setBookingError(t("workshops.detail.confirmMinAge", { n: workshop.minAge }));
      return;
    }
    setIsBooking(true);
    setBookingError(null);
    try {
      const booking = await api.bookWorkshop(workshop.id, ticketQuantity, {
        sessionId: selected?.id,
        acceptMinAge: !!workshop.minAge && ageOk,
      });
      if (booking.requiresPayment) {
        // The seats are held for a short time; the booking is confirmed once the payment succeeds.
        const intent = await api.createPaymentIntent({ purpose: "WORKSHOP_BOOKING", relatedEntityId: booking.id });
        window.location.assign(intent.checkoutUrl ?? `/payment/return?payment=${encodeURIComponent(intent.paymentId)}`);
        return;
      }
      setIsBooked(true);
      reload();
    } catch (err) {
      setBookingError(errMsg(err));
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label={t("workshops.detail.loading")} />
      </ConsumerLayout>
    );
  }

  if (error) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("workshops.detail.unavailable")} message={error} onRetry={reload} />
      </ConsumerLayout>
    );
  }

  if (!workshop) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("workshops.detail.notFound")} message={t("workshops.detail.notFoundDesc")} />
      </ConsumerLayout>
    );
  }

  const shown = selected ?? sessions[0] ?? null;
  const spotsLeft = selected
    ? selected.remaining
    : sessions.length > 1
      ? sessions.reduce((n, s) => n + s.remaining, 0)
      : workshop.capacity - workshop.bookedCount;
  const isSoldOut = spotsLeft <= 0;

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/workshops" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("workshops.detail.back")}
        </Link>

        <div className="bg-white rounded-3xl overflow-hidden border border-[#EAEAEA] shadow-2xs">
          {/* Workshop Image */}
          <div className="relative h-64 md:h-80 w-full bg-[#790166]/10">
            {workshop.imageUrl ? (
              <Image src={workshop.imageUrl} alt={workshop.title} fill className="object-cover" />
            ) : null}
            <div className="absolute top-4 left-4 bg-[#790166] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md">
              {workshop.businessName}
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">{workshop.title}</h1>
              <Link href={`/businesses/${workshop.businessId}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#FA1EFF] mt-1 hover:underline">
                <Store className="w-3.5 h-3.5" /> {t("workshops.detail.organizedBy", { name: workshop.businessName })}
              </Link>
            </div>

            {/* Info Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA]">
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">{t("workshops.detail.date")}</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#FA1EFF]" />
                  {f.date(shown?.date ?? workshop.date)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">{t("workshops.detail.time")}</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#121F3E]" />
                  {shown?.startTime ?? workshop.startTime} - {shown?.finishTime ?? workshop.finishTime}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">{t("workshops.detail.location")}</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#54D1CA]" />
                  {workshop.location}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">{t("workshops.detail.spots")}</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-[#790166]" />
                  {t("workshops.detail.spotsLeft", { n: spotsLeft })}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-[#F9F9F9] pt-4">
              <h3 className="text-sm font-bold text-[#111111]">{t("workshops.detail.about")}</h3>
              <p className="text-xs text-[#555555] leading-relaxed">{workshop.description}</p>
            </div>

            {sessions.length > 1 && (
              <fieldset className="space-y-2 border-t border-[#F9F9F9] pt-4">
                <legend className="text-sm font-bold text-[#111111] mb-2">{t("workshops.detail.session")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sessions.map((s) => {
                    const full = s.remaining <= 0;
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-xs cursor-pointer ${
                          selected?.id === s.id ? "border-[#FA1EFF] bg-[#FAE2F0]/40" : "border-[#EAEAEA] bg-white"
                        } ${full ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <input
                          type="radio"
                          name="session"
                          className="accent-[#FA1EFF]"
                          disabled={full}
                          checked={selected?.id === s.id}
                          onChange={() => {
                            setSessionId(s.id);
                            setTicketQuantity(1);
                          }}
                        />
                        <span className="font-bold text-[#111111]">
                          {f.date(s.date)} · {s.startTime}–{s.finishTime}
                        </span>
                        <span className="ml-auto text-[#555555]">
                          {full ? t("workshops.detail.sessionFull") : t("workshops.detail.spotsLeft", { n: s.remaining })}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <p className="flex items-start gap-2 text-[11px] text-[#555555] bg-[#F9F9F9] rounded-xl p-3">
              <Info className="w-4 h-4 shrink-0 text-[#790166]" />
              <span>
                {workshop.refundPercentage > 0
                  ? t("workshops.detail.policy", { h: workshop.cancellationDeadlineHours, p: workshop.refundPercentage })
                  : t("workshops.detail.policyNone")}
                {workshop.minAge ? ` ${t("workshops.detail.minAge", { n: workshop.minAge })}` : ""}
              </span>
            </p>

            {/* Ticket Booking Box */}
            <div className="bg-[#FAE2F0]/40 p-5 rounded-2xl border border-[#FAE2F0] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#B7B7B7] block">{t("workshops.detail.pricePerTicket")}</span>
                  <span className="text-xl font-extrabold text-[#111111] font-manrope">
                    {workshop.price > 0 ? f.currency(workshop.price) : t("cards.free")}
                  </span>
                </div>

                {!isSoldOut && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111]">{t("workshops.detail.quantity")}</span>
                    <select
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(Number(e.target.value))}
                      className="h-10 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                    >
                      {Array.from({ length: Math.min(5, spotsLeft) }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {t(i > 0 ? "workshops.detail.ticketMany" : "workshops.detail.ticketOne", { n: i + 1 })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {workshop.minAge ? (
                <label className="flex items-start gap-2 text-xs text-[#111111]">
                  <input type="checkbox" className="mt-0.5 accent-[#FA1EFF]" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} />
                  {t("workshops.detail.confirmMinAge", { n: workshop.minAge })}
                </label>
              ) : null}

              {bookingError && (
                <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
                  {bookingError}
                </div>
              )}

              <Button
                variant={isBooked ? "secondary" : "primary"}
                size="lg"
                fullWidth
                disabled={isSoldOut || isBooked}
                isLoading={isBooking}
                onClick={handleBooking}
              >
                {isBooked ? (
                  <>
                    <Check className="w-5 h-5" /> {t("workshops.detail.booked")}
                  </>
                ) : isSoldOut ? (
                  t("workshops.detail.soldOut")
                ) : (
                  t("workshops.detail.reserve")
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
