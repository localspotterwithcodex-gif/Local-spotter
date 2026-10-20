"use client";

import React from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import type { FulfilmentMethod, OrderStatus } from "@/types/order";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "processing" | "completed" | "ontheway" | "cancelled" | "new" | "default" | "pink";
  status?: OrderStatus;
  /** A pickup order that is READY reads "Ready for pickup". */
  fulfilment?: FulfilmentMethod;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  fulfilment,
  children,
  ...props
}) => {
  const { label, t } = useLocale();
  let computedVariant = variant || "default";

  if (status) {
    switch (status) {
      case "PREPARING":
      case "PENDING":
        computedVariant = "processing";
        break;
      case "DELIVERED":
      case "CONFIRMED":
      case "READY":
        computedVariant = "completed";
        break;
      case "OUT_FOR_DELIVERY":
        computedVariant = "ontheway";
        break;
      case "CANCELLED":
      case "REJECTED":
        computedVariant = "cancelled";
        break;
    }
  }

  const variantStyles = {
    processing: "bg-[#F2D9DE] text-[#E54666]",
    completed: "bg-[#CBF5D5] text-[#3B9B52]",
    ontheway: "bg-[#F0E9DF] text-[#E8A74A]",
    cancelled: "bg-[#D9DFF2] text-[#344DB1]",
    new: "bg-[#E8D1ED] text-[#C04BDA]",
    default: "bg-[#EAEAEA] text-[#111111]",
    pink: "bg-[#FAE2F0] text-[#FA1EFF]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors select-none",
        variantStyles[computedVariant],
        className
      )}
      {...props}
    >
      {children || (status ? (status === "READY" && fulfilment === "PICKUP" ? t("status.READY_PICKUP") : label("status", status)) : null)}
    </span>
  );
};
