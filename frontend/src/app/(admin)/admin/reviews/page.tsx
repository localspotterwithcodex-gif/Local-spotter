"use client";

import React, { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { MOCK_REVIEWS } from "@/data/mock/reviews";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Reviews Moderatie</h1>
          <p className="text-xs text-[#B7B7B7]">Beheer en modereer geschreven reviews van consumenten</p>
        </div>

        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111111]">{r.consumerName}</span>
                  <div className="flex items-center text-[#D4B011]">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-bold ml-1">{r.rating}</span>
                  </div>
                </div>
                {r.title && <h4 className="text-xs font-bold text-[#111111]">{r.title}</h4>}
                <p className="text-xs text-[#555555]">{r.comment}</p>
              </div>

              <button
                onClick={() => handleDelete(r.id)}
                className="p-2 text-[#ED4C5C] hover:bg-[#F2D9DE] rounded-xl transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
