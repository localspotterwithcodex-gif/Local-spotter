"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, MapPin, CheckCircle2, ArrowRight } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("Sanne de Jong");
  const [street, setStreet] = useState("Keizersgracht 412");
  const [city, setCity] = useState("Amsterdam");
  const [postalCode, setPostalCode] = useState("1016 GC");
  const [phone, setPhone] = useState("+31 6 12345678");

  const [paymentMethod, setPaymentMethod] = useState<"ideal" | "paypal" | "tikkie">("ideal");
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = 149.00;
  const deliveryFee = 4.95;
  const total = subtotal + deliveryFee;

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      router.push("/account/orders");
    }, 800);
  };

  return (
    <ConsumerLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">Afrekenen</h1>
          <p className="text-xs text-[#B7B7B7]">Controleer je gegevens en kies een betaalmethode</p>
        </div>

        <form onSubmit={handleOrderSubmit} className="space-y-6">
          {/* Bezorgadres Form */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
            <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#54D1CA]" /> Bezorgadres
            </h3>

            <Input
              label="Naam ontvanger"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Straat en huisnummer"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Postcode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
              <Input
                label="Woonplaats"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <Input
              label="Telefoonnummer"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Betaalmethode */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <h3 className="text-sm font-bold font-rubik text-[#111111]">Betaalmethode</h3>

            <div
              onClick={() => setPaymentMethod("ideal")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "ideal" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">iDEAL</span>
              {paymentMethod === "ideal" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>

            <div
              onClick={() => setPaymentMethod("tikkie")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "tikkie" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">Tikkie</span>
              {paymentMethod === "tikkie" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>

            <div
              onClick={() => setPaymentMethod("paypal")}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                paymentMethod === "paypal" ? "border-[#FA1EFF] bg-[#FAE2F0]/30" : "border-[#EAEAEA]"
              }`}
            >
              <span className="text-xs font-bold text-[#111111]">PayPal</span>
              {paymentMethod === "paypal" && <CheckCircle2 className="w-4 h-4 text-[#FA1EFF]" />}
            </div>
          </div>

          {/* Totaal & Submit */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <div className="flex justify-between text-base font-extrabold text-[#111111]">
              <span>Totaal te voldoen</span>
              <span className="text-[#FA1EFF]">{formatCurrency(total)}</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              className="gap-2"
            >
              Plaats Bestelling {formatCurrency(total)}
            </Button>
          </div>
        </form>
      </div>
    </ConsumerLayout>
  );
}
