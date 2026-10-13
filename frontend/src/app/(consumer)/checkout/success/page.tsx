"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag, Truck, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { MOCK_PRODUCTS } from "@/data/mock/products";
import { formatCurrency } from "@/lib/utils";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "LS-2026-" + Math.floor(1000 + Math.random() * 9000);

  const sampleItems = MOCK_PRODUCTS.slice(0, 2);
  const subtotal = sampleItems.reduce((acc, p) => acc + p.price, 0);
  const shipping = 3.95;
  const total = subtotal + shipping;

  return (
    <div className="max-w-2xl mx-auto my-6 sm:my-10 space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 bg-[#FAE2F0] text-[#FA1EFF] rounded-full text-xs font-bold font-manrope">
            Bestelling Bevestigd
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-rubik text-[#111111]">
            Bedankt voor je bestelling!
          </h1>
          <p className="text-xs text-[#B7B7B7]">
            Ordernummer: <span className="font-bold text-[#111111]">{orderNumber}</span>
          </p>
        </div>

        <p className="text-sm text-[#111111] max-w-md mx-auto">
          We hebben een bevestiging gemaild. De lokale ondernemer maakt je pakket nu met zorg gereed!
        </p>

        {/* Estimated Delivery Badge */}
        <div className="flex items-center justify-center gap-2 p-3 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] max-w-md mx-auto text-xs text-[#111111] font-bold">
          <Truck className="w-4 h-4 text-[#FA1EFF]" />
          <span>Verwachte bezorging: Morgen tussen 14:00 - 18:00</span>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
        <h2 className="text-lg font-bold font-rubik text-[#111111] border-b border-[#EAEAEA] pb-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#FA1EFF]" />
          Besteloverzicht
        </h2>

        {/* Product Items */}
        <div className="space-y-4">
          {sampleItems.map((product) => (
            <div key={product.id} className="flex items-center gap-4 pb-4 border-b border-[#EAEAEA] last:border-b-0 last:pb-0">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover border border-[#EAEAEA]"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#111111] truncate">{product.name}</h3>
                <p className="text-xs text-[#B7B7B7]">{product.category} • Aantal: 1</p>
                <span className="text-xs font-bold text-[#FA1EFF] block mt-1">
                  {formatCurrency(product.price)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="bg-[#F9F9F9] p-4 rounded-2xl border border-[#EAEAEA] space-y-2 text-xs">
          <div className="flex justify-between text-[#111111]">
            <span>Subtotaal:</span>
            <span className="font-bold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#111111]">
            <span>Verzendkosten (Lokaal):</span>
            <span className="font-bold">{formatCurrency(shipping)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-[#111111] pt-2 border-t border-[#EAEAEA]">
            <span>Totaal Betaald:</span>
            <span className="text-[#FA1EFF]">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-1">
            <span className="font-bold text-[#111111] flex items-center gap-1 mb-1">
              <MapPin className="w-4 h-4 text-[#FA1EFF]" /> Bezorgadres
            </span>
            <p className="text-[#111111] font-medium">Jan de Vries</p>
            <p className="text-[#B7B7B7]">Keizersgracht 142</p>
            <p className="text-[#B7B7B7]">1015 CX Amsterdam</p>
          </div>

          <div className="p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-1">
            <span className="font-bold text-[#111111] flex items-center gap-1 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#54D1CA]" /> Betaalmethode
            </span>
            <p className="text-[#111111] font-medium">iDEAL (ING Bank)</p>
            <p className="text-[#3B9B52] font-bold mt-1">✓ Betaling Ontvangen</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/account/orders" className="flex-1">
            <Button variant="secondary" fullWidth className="h-12">
              BEKIJK MIJN BESTELLINGEN
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="primary" fullWidth className="h-12 gap-2">
              VERDER WINKELEN <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <ConsumerLayout>
      <Suspense fallback={
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111111]">Bestelling laden...</p>
        </div>
      }>
        <CheckoutSuccessContent />
      </Suspense>
    </ConsumerLayout>
  );
}
