"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Navigation, Store } from "lucide-react";
import { Shoproute } from "@/types/shoproute";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { formatDuration } from "@/lib/maps";

interface ShoprouteCardProps {
  route: Shoproute;
}

export const ShoprouteCard: React.FC<ShoprouteCardProps> = ({ route }) => {
  const { t } = useLocale();
  const f = useFormat();
  return (
    <Link
      href={`/shoproutes/${route.id}`}
      className="group block bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs hover:shadow-md hover:border-[#54D1CA]/40 transition-all"
    >
      <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden bg-[#54D1CA]/10 mb-3">
        {route.imageUrl ? (
          <Image
            src={route.imageUrl}
            alt={route.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-[#54D1CA] text-white flex items-center justify-center font-bold">
            ROUTE
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold text-[#111111] flex items-center gap-1 shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-[#54D1CA]" />
          {route.cityName}
        </div>
        {route.featured && (
          <div className="absolute top-2.5 right-2.5 bg-[#FA1EFF] px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xs">
            {t("routes.featured")}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-[#111111] group-hover:text-[#54D1CA] transition-colors leading-snug">
          {route.title}
        </h3>
        <p className="text-xs text-[#B7B7B7] line-clamp-2 leading-relaxed">
          {route.description}
        </p>

        {(route.theme || route.distanceKm != null || route.durationMinutes != null) && (
          <p className="text-[11px] font-medium text-[#555555]">
            {[
              route.theme,
              route.distanceKm != null ? `${f.number(route.distanceKm, { maximumFractionDigits: 1 })} km` : null,
              route.durationMinutes != null && route.durationMinutes > 0 ? formatDuration(route.durationMinutes) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#F9F9F9]">
          <span className="text-xs font-medium text-[#111111] flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-[#FA1EFF]" />
            {t("cards.participatingShops", { n: route.shopCount })}
          </span>
          <span className="text-xs font-bold text-[#54D1CA] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            {t("cards.startRoute")} <Navigation className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
};
