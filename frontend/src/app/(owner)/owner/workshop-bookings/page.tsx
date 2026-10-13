"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Ticket, CheckCircle2 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { WorkshopBooking } from "@/types/workshop";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OwnerWorkshopBookingsPage() {
  const [bookings, setBookings] = useState<WorkshopBooking[]>([
    {
      id: "bk-1",
      workshopId: "ws-1",
      workshopTitle: "Workshop: Maak je eigen Leren Pasjeshouder",
      consumerId: "cons-1",
      consumerName: "Sanne de Jong",
      ticketQuantity: 2,
      totalAmount: 98.00,
      status: "CONFIRMED",
      createdAt: "2026-03-01T11:00:00Z",
    },
    {
      id: "bk-2",
      workshopId: "ws-1",
      workshopTitle: "Workshop: Maak je eigen Leren Pasjeshouder",
      consumerId: "cons-2",
      consumerName: "Emma Bakker",
      ticketQuantity: 1,
      totalAmount: 49.00,
      status: "CONFIRMED",
      createdAt: "2026-03-02T15:30:00Z",
    },
  ]);

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
            <span className="text-3xl font-extrabold font-rubik">15</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#D9DFF2] text-[#344DB1] space-y-1">
            <span className="text-xs font-bold block">Cancelled Tickets</span>
            <span className="text-3xl font-extrabold font-rubik">1</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#E8D1ED] text-[#C04BDA] space-y-1">
            <span className="text-xs font-bold block">New Tickets Purchased</span>
            <span className="text-3xl font-extrabold font-rubik">3</span>
          </div>
        </div>

        {/* Bookings Table/List */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-4">
          <h3 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#790166]" /> Recente Boekingen
          </h3>

          <div className="space-y-3">
            {bookings.map((bk) => (
              <div key={bk.id} className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#790166]">{bk.workshopTitle}</span>
                  <p className="text-xs font-bold text-[#111111] mt-0.5">{bk.consumerName} ({bk.ticketQuantity} tickets)</p>
                  <span className="text-[11px] text-[#B7B7B7]">{formatDate(bk.createdAt)}</span>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <span className="text-sm font-extrabold text-[#111111]">{formatCurrency(bk.totalAmount)}</span>
                  <span className="px-3 py-1 bg-[#CBF5D5] text-[#3B9B52] text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bevestigd
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
