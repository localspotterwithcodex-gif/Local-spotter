"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Trash2, ArrowRight, Store, ImageOff } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useCart } from "@/features/cart/CartContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";


export default function CartPage() {
  const { items, subtotal, deliveryFee, isLoading, isUpdating, error, reload, updateQuantity: setQuantity, removeItem } = useCart();
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(errMsg(err));
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    void run(() => setQuantity(id, current.quantity + delta));
  };

  const total = subtotal + deliveryFee;

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FA1EFF]" /> {t("cart.title")}
          </h1>
          <p className="text-xs text-[#B7B7B7]">{t("cart.subtitle")}</p>
        </div>

        {actionError && (
          <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
            {actionError}
          </div>
        )}

        {isLoading ? (
          <LoadingState label={t("cart.loading")} />
        ) : error ? (
          <ErrorState title={t("cart.unavailable")} message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#EAEAEA] text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-[#B7B7B7] mx-auto" />
            <h3 className="text-base font-bold font-rubik text-[#111111]">{t("cart.emptyTitle")}</h3>
            <p className="text-xs text-[#B7B7B7]">{t("cart.emptyDesc")}</p>
            <Link href="/products" className="inline-block">
              <Button variant="primary" size="md">
                {t("cart.browseProducts")}
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
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#B7B7B7]">
                        <ImageOff className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#FA1EFF] flex items-center gap-1">
                        <Store className="w-3 h-3" /> {item.businessName}
                      </span>
                      <h3 className="text-xs font-bold text-[#111111] truncate">{item.name}</h3>
                      {item.variantLabel && <span className="text-[11px] text-[#B7B7B7]">{item.variantLabel}</span>}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-extrabold text-[#111111]">
                        {f.currency(item.price * item.quantity)}
                      </span>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-[#EAEAEA] rounded-lg bg-[#F9F9F9]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            aria-label={t("cart.decrease")}
                            disabled={isUpdating}
                            className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            aria-label={t("cart.increase")}
                            disabled={isUpdating}
                            className="w-7 h-7 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => void run(() => removeItem(item.id))}
                          disabled={isUpdating}
                          aria-label={t("cart.removeItem")}
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
                <span>{t("cart.subtotal")}</span>
                <span className="font-bold text-[#111111]">{f.currency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#555555]">
                <span>{t("cart.delivery")}</span>
                <span className="font-bold text-[#111111]">{f.currency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#111111] pt-2 border-t border-[#F9F9F9]">
                <span>{t("cart.totalInclVat")}</span>
                <span className="text-[#FA1EFF]">{f.currency(total)}</span>
              </div>

              <Link href="/checkout" className="block pt-2">
                <Button variant="primary" size="lg" fullWidth className="gap-2">
                  {t("cart.toCheckout")} <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
