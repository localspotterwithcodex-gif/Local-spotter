"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Check, Edit3 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ShoprouteLocationPage() {
  const router = useRouter();

  const [state, setState] = useState("Limburg");
  const [city, setCity] = useState("Horn");
  const [street, setStreet] = useState("Mussenberg 128");
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      router.push("/owner");
    }, 1500);
  };

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Update Shoproutes Locatie</h1>
            <p className="text-xs text-[#B7B7B7]">
              Beheer je exacte GPS en adresgegevens voor weergave op de winkelkaart en shoproutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="State / Provincie *"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
              <Input
                label="City / Stad *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <Input
              label="Street & House Number *"
              icon={<MapPin className="w-4 h-4 text-[#54D1CA]" />}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />

            {/* Interactive Map Location Pin Preview */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-[#111111]">Kaart Locatie Preview</label>
              <div className="h-56 w-full bg-[#54D1CA]/10 rounded-2xl border border-[#54D1CA]/30 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-[#54D1CA] text-white flex items-center justify-center shadow-lg mb-2 animate-bounce">
                  <MapPin className="w-7 h-7" />
                </div>
                <span className="text-sm font-bold text-[#111111]">Your store is here</span>
                <span className="text-xs text-[#555555]">
                  {street}, {city} ({state})
                </span>
                <span className="text-[10px] text-[#B7B7B7] mt-1">GPS: 51.2058° N, 5.9467° E</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Button type="button" variant="secondary" size="lg" className="flex-1 gap-1">
                <Edit3 className="w-4 h-4" /> WIJZIGEN
              </Button>
              <Button type="submit" variant="primary" size="lg" className="flex-1 gap-1">
                {isSaved ? (
                  <>
                    <Check className="w-5 h-5" /> Opslaan Succesvol!
                  </>
                ) : (
                  "BEVESTIGEN"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
