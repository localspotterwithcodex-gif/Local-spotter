import React from "react";
import { Award } from "lucide-react";

export type SubscriptionTier = "WEBSHOP" | "SHOPROUTES" | "WORKSHOP";

const TIER_CONFIG: Record<SubscriptionTier, { label: string; ring: string; fill: string; text: string }> = {
  // Webshop plan -> Silver badge
  WEBSHOP: {
    label: "Webshop",
    ring: "ring-[#C0C0C0]",
    fill: "bg-gradient-to-br from-[#E8E8E8] to-[#B0B0B0]",
    text: "text-[#4A4A4A]",
  },
  // Shoproutes plan -> Gold badge
  SHOPROUTES: {
    label: "Shoproutes",
    ring: "ring-[#E5B94E]",
    fill: "bg-gradient-to-br from-[#F7DE9A] to-[#D8A62E]",
    text: "text-[#6B4E10]",
  },
  // Workshop plan -> Platinum badge
  WORKSHOP: {
    label: "Workshop",
    ring: "ring-[#B9A6D9]",
    fill: "bg-gradient-to-br from-[#E4D9F5] to-[#B79FE0]",
    text: "text-[#3F2C63]",
  },
};

/**
 * Silver (Webshop) / Gold (Shoproutes) / Platinum (Workshop) tier badge —
 * PROMPT.md items 5 & 6. Driven by the business's real subscription tier,
 * not hardcoded — pass whatever the backend's BusinessSubscription.plan
 * resolves to.
 */
export const SubscriptionBadge: React.FC<{ tier: SubscriptionTier; showLabel?: boolean; className?: string }> = ({
  tier,
  showLabel = true,
  className,
}) => {
  const cfg = TIER_CONFIG[tier];
  return (
    <div
      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full ring-2 ${cfg.ring} ${cfg.fill} ${className || ""}`}
      title={`${cfg.label} plan`}
    >
      <span className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center">
        <Award className={`w-3.5 h-3.5 ${cfg.text}`} />
      </span>
      {showLabel && <span className={`text-[11px] font-bold ${cfg.text}`}>{cfg.label}</span>}
    </div>
  );
};
