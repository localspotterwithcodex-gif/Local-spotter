"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Clock, MapPin, Users, Calendar as CalendarIcon, Store, Check, ArrowLeft } from "lucide-react";
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
  const [bookedTickets, setBookedTickets] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleBooking = async () => {
    if (!workshop) return;
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsBooking(true);
    setBookingError(null);
    try {
      await api.bookWorkshop(workshop.id, ticketQuantity);
      setBookedTickets((n) => n + ticketQuantity);
      setIsBooked(true);
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

  const spotsLeft = workshop.capacity - workshop.bookedCount - bookedTickets;
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
                  {f.date(workshop.date)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">{t("workshops.detail.time")}</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#121F3E]" />
                  {workshop.startTime} - {workshop.finishTime}
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
