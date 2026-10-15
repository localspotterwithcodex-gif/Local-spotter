import React from "react";

/**
 * Shared frame for the sign-in / sign-up / password screens, as drawn in the
 * Figma "login" and "signup" frames: pale-pink top with the logo, the magenta
 * wave, and the form below on the #F9F9F9 page background. The pink header and
 * wave span the full browser width (so the web view fills the screen) while
 * the form keeps the Figma column width, centred.
 */
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#F9F9F9]">
    <div className="bg-[#FAE2F0] pt-16 md:pt-20 pb-0 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="LocalSpotter" className="h-24 md:h-32 w-auto object-contain" />
    </div>
    <svg viewBox="0 0 428 130" className="block w-full h-[130px] md:h-[200px] -mt-px" aria-hidden="true" preserveAspectRatio="none">
      <rect width="428" height="130" fill="#FAE2F0" />
      <path d="M0 62 C 120 40, 220 20, 428 78 L428 130 L0 130 Z" fill="#F9F9F9" opacity="0" />
      <path d="M140 70 C 230 40, 330 40, 428 92 L428 130 L190 130 C 170 110, 150 95, 140 70 Z" fill="#F9F9F9" opacity="0.55" />
      <path d="M60 48 C 160 20, 250 34, 340 66 C 380 80, 410 96, 428 110 L428 130 L0 130 L0 66 Z" fill="#FA1EFF" opacity="0.38" />
      <path d="M0 22 C 60 26, 130 40, 180 52 C 220 62, 235 70, 250 78 C 180 118, 60 118, 0 96 Z" fill="#FA1EFF" />
      <path d="M0 130 L0 112 C 120 118, 330 80, 428 118 L428 130 Z" fill="#F9F9F9" />
    </svg>
    <div className="mx-auto w-full max-w-[428px] px-8 pb-12 -mt-6">{children}</div>
  </div>
);

/** The small magenta pill button used for LOGIN / SIGN UP / CREATE in the Figma frames. */
export const authButtonClass =
  "mx-auto flex items-center justify-center h-10 min-w-[104px] px-8 rounded-lg bg-[#FA1EFF] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#E000EC] active:scale-[0.98] transition disabled:opacity-50";
