"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function AddressesPage() {
  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar account
        </Link>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Delivery Address</h1>
          </div>

          <EmptyState
            title="Opgeslagen adressen nog niet beschikbaar"
            description="Je bezorgadres vul je op dit moment in tijdens het afrekenen."
          />
        </div>
      </div>
    </ConsumerLayout>
  );
}
