"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, MessageSquare, Trash2, ArrowLeft, Store, ExternalLink } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { MOCK_REVIEWS } from "@/data/mock/reviews";
import { MOCK_BUSINESSES } from "@/data/mock/businesses";
import { MOCK_PRODUCTS } from "@/data/mock/products";
import { formatDate } from "@/lib/utils";

export default function ConsumerReviewsPage() {
  // Filter reviews for current mock consumer 'user-consumer' or fallback to all demo consumer reviews
  const [reviews, setReviews] = useState(
    MOCK_REVIEWS.filter((r) => r.consumerId === "user-consumer" || r.consumerId === "cons-1")
  );

  const handleDelete = (id: string) => {
    if (confirm("Weet je zeker dat je deze beoordeling wilt verwijderen?")) {
      setReviews(reviews.filter((r) => r.id !== id));
    }
  };

  const getBusinessName = (busId: string) => {
    return MOCK_BUSINESSES.find((b) => b.id === busId)?.name || "Lokale Winkel";
  };

  const getProductName = (prodId?: string) => {
    if (!prodId) return null;
    return MOCK_PRODUCTS.find((p) => p.id === prodId)?.name || "Product";
  };

  return (
    <ConsumerLayout>
      <div className="max-w-4xl mx-auto my-6 space-y-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA]">
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="w-10 h-10 rounded-full bg-[#F9F9F9] border border-[#EAEAEA] flex items-center justify-center text-[#111111] hover:bg-[#FAE2F0] hover:text-[#FA1EFF] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-rubik text-[#111111]">
                Mijn Beoordelingen
              </h1>
              <p className="text-xs text-[#B7B7B7]">
                Overzicht van alle reviews die jij hebt geschreven voor lokale ondernemers.
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-[#FAE2F0] text-[#FA1EFF] rounded-2xl text-xs font-bold font-manrope">
            {reviews.length} Beoordelingen
          </div>
        </div>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#EAEAEA] text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#F9F9F9] text-[#B7B7B7] flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#111111]">Nog geen reviews geschreven</h2>
              <p className="text-xs text-[#B7B7B7] max-w-sm mx-auto">
                Laat na een aankoop of workshop een beoordeling achter om andere lokalen te helpen ontdekken!
              </p>
            </div>
            <Link href="/products">
              <Button variant="primary" className="mt-2">
                ONTDEK PRODUCTEN
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const businessName = getBusinessName(review.businessId);
              const productName = getProductName(review.productId);

              return (
                <div
                  key={review.id}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EAEAEA] shadow-xs space-y-3 transition-all hover:border-[#FAE2F0]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#FA1EFF]" />
                        <span className="text-xs font-bold text-[#111111]">{businessName}</span>
                        {productName && (
                          <span className="text-xs text-[#B7B7B7]">
                            • <span className="text-[#111111] font-medium">{productName}</span>
                          </span>
                        )}
                      </div>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "text-[#D4B011] fill-[#D4B011]"
                                : "text-[#DADADA]"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-[#111111] ml-1">
                          {review.rating}.0
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#B7B7B7]">
                        {formatDate(review.createdAt)}
                      </span>
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-2 text-[#B7B7B7] hover:text-[#E54666] hover:bg-[#F2D9DE] rounded-xl transition-colors"
                        title="Verwijder review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {review.title && (
                    <h3 className="text-sm font-bold text-[#111111]">{review.title}</h3>
                  )}

                  <p className="text-xs text-[#111111] leading-relaxed bg-[#F9F9F9] p-3 rounded-2xl border border-[#EAEAEA]">
                    "{review.comment}"
                  </p>

                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {review.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Review bijlage"
                          className="w-16 h-16 rounded-xl object-cover border border-[#EAEAEA]"
                        />
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/businesses/${review.businessId}`}
                      className="text-xs text-[#FA1EFF] hover:underline font-bold flex items-center gap-1"
                    >
                      Bekijk Winkelpagina <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
