"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ShoprouteCard } from "@/components/cards/ShoprouteCard";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Shoproute } from "@/types/shoproute";

export default function ShoproutesListingPage() {
  const [routes, setRoutes] = useState<Shoproute[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoutes() {
      setIsLoading(true);
      const data = await api.getShoproutes({ city: selectedCity || undefined });
      setRoutes(data);
      setIsLoading(false);
    }
    loadRoutes();
  }, [selectedCity]);

  const cities = ["Delft", "Rotterdam", "Utrecht", "Amsterdam"];

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Interactieve Shoproutes</h1>
          <p className="text-xs text-[#B7B7B7]">Wandel langs de leukste speciaalzaken en ontdek lokale parels in Nederlandse steden</p>
        </div>

        {/* City Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#B7B7B7]">Stad:</span>
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              selectedCity === null ? "bg-[#54D1CA] text-white" : "bg-[#EAEAEA] text-[#111111]"
            }`}
          >
            Alle Steden
          </button>
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                selectedCity === city ? "bg-[#54D1CA] text-white" : "bg-[#EAEAEA] text-[#111111]"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {city}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoadingState label="Shoproutes laden..." />
        ) : routes.length === 0 ? (
          <EmptyState
            title="Geen shoproutes gevonden"
            description="Er zijn nog geen shoproutes voor deze stad."
            actionLabel="Bekijk alle steden"
            onAction={() => setSelectedCity(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routes.map((route) => (
              <ShoprouteCard key={route.id} route={route} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
