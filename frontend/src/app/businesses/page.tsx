"use client";

import React, { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Business } from "@/types/business";

export default function BusinessListingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBusinesses() {
      setIsLoading(true);
      const data = await api.getBusinesses({
        query: searchQuery || undefined,
        city: selectedCity || undefined,
      });
      setBusinesses(data);
      setIsLoading(false);
    }
    loadBusinesses();
  }, [searchQuery, selectedCity]);

  const cities = ["Delft", "Rotterdam", "Horn", "Utrecht"];

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Lokale Winkels (Onze Locals)</h1>
            <p className="text-xs text-[#B7B7B7]">Ontdek bijzondere speciaalzaken en boetieks in Nederland</p>
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Zoek winkel op naam..."
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* City Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-[#B7B7B7]">Stad:</span>
          <button
            onClick={() => setSelectedCity(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              selectedCity === null ? "bg-[#FA1EFF] text-white" : "bg-[#EAEAEA] text-[#111111]"
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
          <LoadingState label="Winkels laden..." />
        ) : businesses.length === 0 ? (
          <EmptyState
            title="Geen winkels gevonden"
            description="Probeer een andere zoekopdracht of kies een andere stad."
            actionLabel="Reset zoekopdracht"
            onAction={() => {
              setSearchQuery("");
              setSelectedCity(null);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
