"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Business } from "@/types/business";

export default function ConsumerFollowingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFollowing() {
      setIsLoading(true);
      const data = await api.getBusinesses();
      // Filter workshop plan businesses as followed examples
      setBusinesses(data.filter((b) => b.subscriptionPlan === "workshop"));
      setIsLoading(false);
    }
    loadFollowing();
  }, []);

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar account
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Gevolgde Winkels</h1>
          <p className="text-xs text-[#B7B7B7]">Winkels die je volgt voor updates, nieuwe producten en workshops</p>
        </div>

        {isLoading ? (
          <LoadingState label="Gevolgde winkels laden..." />
        ) : businesses.length === 0 ? (
          <EmptyState
            title="Je volgt nog geen winkels"
            description="Ontdek lokale winkels en klik op 'Volg Winkel' om updates te ontvangen."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
