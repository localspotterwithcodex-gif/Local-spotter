import React from "react";

/**
 * The LocalSpotter logo, drawn from the brand artwork: magnifier over a map pin,
 * "LOCAL" in bold navy and "SPOTTER" in light pink, both set to the same width.
 * Inline SVG so it stays sharp at any size and uses the self-hosted logo font.
 */

const NAVY = "#0A182E";
const YELLOW = "#FBBC3E";
const PIN = "#F4ADCC";
const WORD_PINK = "#EA89B1";

const Mark: React.FC = () => (
  <>
    <ellipse cx="135" cy="342" rx="88" ry="7" fill={PIN} opacity="0.45" />
    <path d="M132 340 L52 236 A110 110 0 1 1 212 236 Z" fill={PIN} />
    <circle cx="124" cy="133" r="108" fill="#FFFFFF" stroke={NAVY} strokeWidth="14" />
    <circle cx="124" cy="133" r="86" fill="none" stroke={YELLOW} strokeWidth="20" />
    <line x1="205" y1="214" x2="250" y2="276" stroke={NAVY} strokeWidth="30" strokeLinecap="round" />
    <line x1="207" y1="217" x2="250" y2="276" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
  </>
);

interface BrandLogoProps {
  /** "full" = icon + wordmark, "mark" = icon only. */
  variant?: "full" | "mark";
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant = "full", className }) => {
  if (variant === "mark") {
    return (
      <svg viewBox="0 10 290 345" className={className} role="img" aria-label="LocalSpotter">
        <Mark />
      </svg>
    );
  }
  return (
    <svg viewBox="0 10 880 345" className={className} role="img" aria-label="LocalSpotter">
      <Mark />
      <g style={{ fontFamily: "var(--font-logo)" }}>
        <text x="298" y="176" fontSize="172" fontWeight="800" fill={NAVY} textLength="575" lengthAdjust="spacingAndGlyphs">
          LOCAL
        </text>
        <text x="300" y="290" fontSize="114" fontWeight="400" fill={WORD_PINK} textLength="572" lengthAdjust="spacing">
          SPOTTER
        </text>
      </g>
    </svg>
  );
};
