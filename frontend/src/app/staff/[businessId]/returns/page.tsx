"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { ShopReturnsBoard } from "@/features/returns/ShopReturnsBoard";
import { useLocale } from "@/i18n/LocaleContext";

export default function StaffReturnsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(params);
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/staff" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("staff.title")}
        </Link>
        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("returns.shop.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("returns.shop.subtitle")}</p>
        </div>
        <ShopReturnsBoard businessId={businessId} />
      </div>
    </RoleLayout>
  );
}
