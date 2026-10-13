"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Users, Calendar as CalendarIcon, Store, Check, ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { Workshop } from "@/types/workshop";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function WorkshopDetailPage({ params }: { params: Promise<{ workshopId: string }> }) {
  const { workshopId } = use(params);

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkshop() {
      setIsLoading(true);
      const data = await api.getWorkshopById(workshopId);
      setWorkshop(data);
      setIsLoading(false);
    }
    loadWorkshop();
  }, [workshopId]);

  const handleBooking = async () => {
    if (!workshop) return;
    setIsBooking(true);
    try {
      await api.bookWorkshop(workshop.id, ticketQuantity);
      setIsBooked(true);
    } catch (err: any) {
      alert(err.message || "Boeking mislukt");
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label="Workshop gegevens laden..." />
      </ConsumerLayout>
    );
  }

  if (!workshop) {
    return (
      <ConsumerLayout>
        <ErrorState title="Workshop niet gevonden" message="Deze workshop bestaat niet meer." />
      </ConsumerLayout>
    );
  }

  const spotsLeft = workshop.capacity - workshop.bookedCount;
  const isSoldOut = spotsLeft <= 0;

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/workshops" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar workshops
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
                <Store className="w-3.5 h-3.5" /> georganiseerd door {workshop.businessName}
              </Link>
            </div>

            {/* Info Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA]">
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">Datum</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#FA1EFF]" />
                  {formatDate(workshop.date)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">Tijd</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#121F3E]" />
                  {workshop.startTime} - {workshop.finishTime}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">Locatie</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#54D1CA]" />
                  {workshop.location}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#B7B7B7] block">Plaatsen</span>
                <span className="text-xs font-bold text-[#111111] flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-[#790166]" />
                  {spotsLeft} beschikbaar
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-[#F9F9F9] pt-4">
              <h3 className="text-sm font-bold text-[#111111]">Over deze workshop</h3>
              <p className="text-xs text-[#555555] leading-relaxed">{workshop.description}</p>
            </div>

            {/* Ticket Booking Box */}
            <div className="bg-[#FAE2F0]/40 p-5 rounded-2xl border border-[#FAE2F0] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#B7B7B7] block">Prijs per ticket</span>
                  <span className="text-xl font-extrabold text-[#111111] font-manrope">
                    {workshop.price > 0 ? formatCurrency(workshop.price) : "Gratis"}
                  </span>
                </div>

                {!isSoldOut && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#111111]">Aantal:</span>
                    <select
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(Number(e.target.value))}
                      className="h-10 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                    >
                      {Array.from({ length: Math.min(5, spotsLeft) }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} ticket{i > 0 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

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
                    <Check className="w-5 h-5" /> Ticket Gereserveerd!
                  </>
                ) : isSoldOut ? (
                  "Helaas Volboekt"
                ) : (
                  "Buy Ticket (Reserveer Nu)"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
