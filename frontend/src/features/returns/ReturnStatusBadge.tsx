"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/i18n/LocaleContext";
import type { ReturnStatus } from "@/lib/api";

const VARIANT: Record<ReturnStatus, "processing" | "completed" | "ontheway" | "cancelled" | "new"> = {
  REQUESTED: "new",
  APPROVED: "ontheway",
  RECEIVED: "processing",
  REFUNDED: "completed",
  REJECTED: "cancelled",
  CANCELLED: "cancelled",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const { t } = useLocale();
  return <Badge variant={VARIANT[status]}>{t(`returns.status.${status}` as never)}</Badge>;
}
