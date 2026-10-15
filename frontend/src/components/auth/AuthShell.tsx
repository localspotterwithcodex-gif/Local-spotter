import React from "react";

/**
 * Shared frame for the sign-in / sign-up / password screens, as drawn in the
 * Figma "login" and "signup" frames: pale-pink top with the logo, the magenta
 * wave, and a single 428px column on phones; on web (md and up) a full-height brand panel beside a centred form.
 */
export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#F9F9F9] md:flex">
    {/* Web: full-height brand panel on the left (mobile uses the header below instead). */}
    <aside className="hidden md:flex md:w-1/2 lg:w-[46%] relative overflow-hidden bg-[#FAE2F0] items-center justify-center" aria-hidden="true">
      <div className="absolute -left-24 -bottom-24 w-[28rem] h-[28rem] rounded-full bg-[#FA1EFF]" />
      <div className="absolute -right-32 bottom-10 w-[26rem] h-[26rem] rounded-full bg-[#FA1EFF] opacity-35" />
      <div className="absolute right-10 -top-24 w-64 h-64 rounded-full bg-white opacity-50" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="relative h-32 lg:h-40 w-auto object-contain" />
    </aside>

    <div className="flex-1 md:flex md:items-center md:justify-center">
      <div className="relative mx-auto w-full max-w-[428px] min-h-screen md:min-h-0 bg-[#F9F9F9] md:max-w-md md:px-4">
        <div className="md:hidden">
          <div className="bg-[#FAE2F0] pt-16 pb-0 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="LocalSpotter" className="h-24 w-auto object-contain" />
          </div>
          <svg viewBox="0 0 428 130" className="block w-full -mt-px" aria-hidden="true" preserveAspectRatio="none">
            <rect width="428" height="130" fill="#FAE2F0" />
            <path d="M0 62 C 120 40, 220 20, 428 78 L428 130 L0 130 Z" fill="#F9F9F9" opacity="0" />
            <path d="M140 70 C 230 40, 330 40, 428 92 L428 130 L190 130 C 170 110, 150 95, 140 70 Z" fill="#F9F9F9" opacity="0.55" />
            <path d="M60 48 C 160 20, 250 34, 340 66 C 380 80, 410 96, 428 110 L428 130 L0 130 L0 66 Z" fill="#FA1EFF" opacity="0.38" />
            <path d="M0 22 C 60 26, 130 40, 180 52 C 220 62, 235 70, 250 78 C 180 118, 60 118, 0 96 Z" fill="#FA1EFF" />
            <path d="M0 130 L0 112 C 120 118, 330 80, 428 118 L428 130 Z" fill="#F9F9F9" />
          </svg>
        </div>
        <div className="px-8 pb-12 -mt-6 md:mt-0 md:px-4 md:py-12">{children}</div>
      </div>
    </div>
  </div>
);

/** The small magenta pill button used for LOGIN / SIGN UP / CREATE in the Figma frames. */
export const authButtonClass =
  "mx-auto flex items-center justify-center h-10 min-w-[104px] px-8 rounded-lg bg-[#FA1EFF] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#E000EC] active:scale-[0.98] transition disabled:opacity-50";
