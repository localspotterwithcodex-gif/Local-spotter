"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Plus, Check } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";

interface Address {
  id: string;
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: "addr-1",
      name: "Sanne de Jong (Thuis)",
      street: "Keizersgracht",
      houseNumber: "412",
      city: "Amsterdam",
      postalCode: "1016 GC",
      isDefault: true,
    },
  ]);

  const setDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

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
            <Button variant="secondary" size="sm" className="gap-1 text-xs">
              <Plus className="w-4 h-4" /> Adres Toevoegen
            </Button>
          </div>

          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111111]">{addr.name}</span>
                  {addr.isDefault && (
                    <span className="bg-[#CBF5D5] text-[#3B9B52] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Standaard
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#555555] space-y-0.5">
                  <p>{addr.street} {addr.houseNumber}</p>
                  <p>{addr.postalCode} {addr.city}</p>
                </div>

                {!addr.isDefault && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="text-xs font-bold text-[#FA1EFF] hover:underline pt-1 block"
                  >
                    Instellen als standaard
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
