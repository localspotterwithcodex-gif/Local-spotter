import React from "react";

const sizes = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" } as const;

interface Props {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  /** "square" suits shop logos, "round" suits people. */
  shape?: "round" | "square";
  className?: string;
}

/** A small profile/shop picture; falls back to the initials when there is no image. */
export function Avatar({ src, name, size = "md", shape = "round", className = "" }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const radius = shape === "round" ? "rounded-full" : "rounded-lg";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={`${sizes[size]} ${radius} shrink-0 border border-[#EAEAEA] object-cover bg-[#F9F9F9] ${className}`} />
  ) : (
    <span aria-hidden="true" className={`${sizes[size]} ${radius} shrink-0 inline-flex items-center justify-center bg-[#FAE2F0] font-bold text-[#790166] ${className}`}>
      {initials || "?"}
    </span>
  );
}
