"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle, Presentation, ShoppingBag, Undo2 } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";

/** Shops the signed-in user works for (employee access: chat and workshop participants). */
export default function StaffHomePage() {
  const { t } = useLocale();
  const shops = useApiResource("staff-shops", () => api.getStaffShops());

  return (
    <RoleLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("staff.title")}</h1>
        {shops.loading ? (
          <LoadingState />
        ) : shops.error ? (
          <ErrorState message={shops.error} onRetry={shops.reload} />
        ) : (shops.data ?? []).length === 0 ? (
          <EmptyState title={t("staff.empty")} description={t("staff.emptyDesc")} />
        ) : (
          <ul className="space-y-3">
            {(shops.data ?? []).map((s) => (
              <li key={s.businessId} className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
                <div>
                  <p className="text-sm font-bold text-[#121F3E]">{s.businessName}</p>
                  <p className="text-[11px] text-[#B7B7B7]">
                    {s.city ?? ""} · {s.role === "MANAGER" ? t("staff.roleManager") : t("staff.roleStaff")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-[#FA1EFF]">
                  <Link href={`/chat?shop=${s.businessId}`} className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> {t("staff.messages")}
                  </Link>
                  <Link href={`/staff/${s.businessId}/orders`} className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4" /> {t("staff.orders")}
                  </Link>
                  <Link href={`/staff/${s.businessId}/returns`} className="flex items-center gap-1">
                    <Undo2 className="w-4 h-4" /> {t("returns.shop.title")}
                  </Link>
                  <Link href={`/staff/${s.businessId}/workshops`} className="flex items-center gap-1">
                    <Presentation className="w-4 h-4" /> {t("staff.workshops")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RoleLayout>
  );
}
