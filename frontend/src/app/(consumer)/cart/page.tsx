"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Trash2, ArrowRight, Store } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/features/cart/CartContext";

export default function CartPage() {
  // Was previously its own local, hardcoded array disconnected from the
  // header's cart badge — now reads/writes the same CartContext the
  // product page's "Add to Cart" button uses (PROMPT.md items 4/13).
  const { items, updateQuantity: setQuantity, removeItem } = useCart();

  const updateQuantity = (id: string, delta: number) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    setQuantity(id, current.quantity + delta);
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 4.95 : 0;
  const total = subtotal + deliveryFee;

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FA1EFF]" /> Winkelwagen
          </h1>
          <p className="text-xs text-[#B7B7B7]">Bekijk je geselecteerde artikelen</p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#EAEAEA] text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#B7B7B7] mx-auto" />
            <h3 className="text-base font-bold font-rubik text-[#111111]">Je winkelwagen is leeg</h3>
            <p className="text-xs text-[#B7B7B7]">Ontdek unieke producten van Nederlandse winkels!</p>
            <Link href="/products" className="inline-block">
              <Button variant="primary" size="md">
                Bekijk Producten
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items List */}
            <div className="bg-white rounded-3xl p-4 border border-[#EAEAEA] shadow-2xs space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3.5 pb-4 border-b border-[#F9F9F9] last:border-b-0 last:pb-0">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#F9F9F9] shrink-0 border border-[#EAEAEA]">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#FA1EFF] flex items-center gap-1">
                        <Store className="w-3 h-3" /> {item.businessName}
                      </span>
                      <h3 className="text-xs font-bold text-[#111111] truncate">{item.name}</h3>
                      {item.color && <span className="text-[11px] text-[#B7B7B7]">Kleur: {item.color}</span>}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-extrabold text-[#111111]">
                        {formatCurrency(item.price * item.quantity)}
                      </span>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-[#EAEAEA] rounded-lg bg-[#F9F9F9]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-[#ED4C5C] hover:bg-[#F2D9DE] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Box */}
            <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
              <div className="flex justify-between text-xs text-[#555555]">
                <span>Subtotaal</span>
                <span className="font-bold text-[#111111]">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#555555]">
                <span>Bezorgkosten</span>
                <span className="font-bold text-[#111111]">{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#111111] pt-2 border-t border-[#F9F9F9]">
                <span>Totaal (incl. btw)</span>
                <span className="text-[#FA1EFF]">{formatCurrency(total)}</span>
              </div>

              <Link href="/checkout" className="block pt-2">
                <Button variant="primary" size="lg" fullWidth className="gap-2">
                  Doorgaan naar afrekenen <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
