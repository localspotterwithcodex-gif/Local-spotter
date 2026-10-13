"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Users } from "lucide-react";
import { Workshop } from "@/types/workshop";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface WorkshopCardProps {
  workshop: Workshop;
}

export const WorkshopCard: React.FC<WorkshopCardProps> = ({ workshop }) => {
  const { month, day } = formatShortDate(workshop.date);
  const isSoldOut = workshop.bookedCount >= workshop.capacity;

  return (
    <Link
      href={`/workshops/${workshop.id}`}
      className="group block bg-white rounded-2xl p-3 border border-[#EAEAEA] shadow-2xs hover:shadow-md hover:border-[#FAE2F0] transition-all"
    >
      <div className="flex gap-3.5">
        {/* Date block + Image container */}
        <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-[#790166]/10 shrink-0">
          {workshop.imageUrl ? (
            <Image
              src={workshop.imageUrl}
              alt={workshop.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full bg-[#790166] text-white flex items-center justify-center font-bold">
              WS
            </div>
          )}

          {/* Date pill overlay */}
          <div className="absolute top-2 left-2 bg-[#790166] text-white px-2 py-1 rounded-lg text-center shadow-xs">
            <span className="block text-[10px] font-bold tracking-wider leading-none">
              {month}
            </span>
            <span className="block text-sm font-extrabold leading-none mt-0.5">
              {day}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#790166] uppercase tracking-wide">
              {workshop.businessName}
            </span>
            <h3 className="text-xs font-bold text-[#111111] line-clamp-2 mt-0.5 group-hover:text-[#FA1EFF] transition-colors leading-snug">
              {workshop.title}
            </h3>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[#B7B7B7]">
              <Clock className="w-3.5 h-3.5 text-[#121F3E]" />
              <span>{workshop.startTime} - {workshop.finishTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#B7B7B7]">
              <MapPin className="w-3.5 h-3.5 text-[#54D1CA]" />
              <span className="truncate">{workshop.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#F9F9F9]">
            <span className="text-sm font-extrabold text-[#111111]">
              {workshop.price > 0 ? formatCurrency(workshop.price) : "Gratis"}
            </span>

            <Button
              variant={isSoldOut ? "ghost" : "secondary"}
              size="sm"
              disabled={isSoldOut}
              className="h-8 px-3 text-xs"
            >
              {isSoldOut ? "Volboekt" : "Buy Ticket"}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};
