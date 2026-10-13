"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Heart, ShoppingBag } from "lucide-react";
import { Business } from "@/types/business";

interface BusinessCardProps {
  business: Business;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business }) => {
  return (
    <Link
      href={`/businesses/${business.id}`}
      className="group block bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs hover:shadow-md hover:border-[#FAE2F0] transition-all"
    >
      <div className="flex items-start gap-3.5">
        {/* Avatar / Logo */}
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FAE2F0] shrink-0 border border-[#FAE2F0]">
          {business.logoUrl ? (
            <Image
              src={business.logoUrl}
              alt={business.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-[#FA1EFF] text-xl">
              {business.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-sm font-bold text-[#111111] truncate group-hover:text-[#FA1EFF] transition-colors">
              {business.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 fill-[#D4B011] text-[#D4B011]" />
              <span className="text-xs font-bold text-[#111111]">{business.rating}</span>
            </div>
          </div>

          <p className="text-xs font-medium text-[#FA1EFF] mt-0.5">{business.category}</p>

          <p className="text-xs text-[#B7B7B7] line-clamp-2 mt-1 leading-snug">
            {business.description}
          </p>

          <div className="flex items-center gap-4 text-[11px] text-[#B7B7B7] mt-2.5 pt-2 border-t border-[#F9F9F9]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#54D1CA]" />
              {business.location.city}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 text-[#B7B7B7]" />
              {business.productCount} producten
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-[#ED4C5C]" />
              {business.followerCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
