"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Workshop } from "@/types/workshop";

export default function WorkshopListingPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWorkshops() {
      setIsLoading(true);
      const data = await api.getWorkshops();
      if (searchQuery) {
        setWorkshops(
          data.filter(
            (w) =>
              w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              w.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } else {
        setWorkshops(data);
      }
      setIsLoading(false);
    }
    loadWorkshops();
  }, [searchQuery]);

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Lokale Workshops</h1>
            <p className="text-xs text-[#B7B7B7]">Ontwikkel je creativiteit en volg workshops bij lokale ondernemers</p>
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Zoek workshop..."
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Workshops laden..." />
        ) : workshops.length === 0 ? (
          <EmptyState
            title="Geen workshops gevonden"
            description="Probeer een andere zoekopdracht."
            actionLabel="Reset zoekopdracht"
            onAction={() => setSearchQuery("")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
