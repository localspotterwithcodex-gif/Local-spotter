"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ShopRegistrationModal } from "@/components/modals/ShopRegistrationModal";

/**
 * Floating "Join as a shop" bubble.
 *
 * Rendered once in the root layout, so it appears on top of every page.
 * It gently floats/bobs to draw the eye (like a chat/feedback launcher),
 * shows a short speech-bubble hint every so often, and opens the full
 * shop-owner registration form (ShopRegistrationModal) on click.
 *
 * By design the bubble itself can't be permanently dismissed — closing the
 * form just closes the form, the bubble stays available on every page so
 * shop owners always have an obvious way to register — but nobody is
 * blocked from browsing the site if they'd rather not fill it in.
 */
export const ShopJoinWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // First hint shortly after the page loads, then repeat periodically
    // so it stays noticeable without being shown constantly.
    const firstTimer = window.setTimeout(() => setShowHint(true), 1800);
    const hideTimer = window.setTimeout(() => setShowHint(false), 8000);
    const interval = window.setInterval(() => {
      setShowHint(true);
      window.setTimeout(() => setShowHint(false), 6000);
    }, 25000);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(hideTimer);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2 sm:bottom-7 sm:right-7">
        {showHint && !isOpen && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setShowHint(false);
            }}
            className="max-w-[220px] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-left text-sm font-medium text-[#111111] shadow-lg ring-1 ring-black/5 duration-300 animate-in fade-in slide-in-from-bottom-2"
          >
            Heb je een lokale winkel?{" "}
            <span className="font-bold text-[#FA1EFF]">Meld je hier aan!</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Meld je winkel aan bij Local Spotter"
          className="shop-join-bubble group relative grid h-16 w-16 place-items-center rounded-full shadow-xl ring-4 ring-white transition-transform hover:scale-105 active:scale-95 sm:h-[72px] sm:w-[72px]"
        >
          <Image
            src="/images/join-shop-bubble.jpg"
            alt="Meld je winkel aan"
            fill
            sizes="72px"
            className="rounded-full object-cover"
          />
          <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#FA1EFF] text-[10px] font-bold text-white ring-2 ring-white">
            !
          </span>
        </button>
      </div>

      <ShopRegistrationModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <style jsx global>{`
        .shop-join-bubble {
          animation: shop-join-float 3.2s ease-in-out infinite;
        }
        @keyframes shop-join-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shop-join-bubble {
            animation: none;
          }
        }
      `}</style>
    </>
  );
};
