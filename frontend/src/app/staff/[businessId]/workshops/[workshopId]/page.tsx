"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { WorkshopParticipantsView } from "@/features/owner/WorkshopParticipantsView";
import { useLocale } from "@/i18n/LocaleContext";

export default function StaffParticipantsPage({ params }: { params: Promise<{ businessId: string; workshopId: string }> }) {
  const { businessId, workshopId } = use(params);
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href={`/staff/${businessId}/workshops`} className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" /> {t("staff.workshops")}
        </Link>
        <WorkshopParticipantsView workshopId={workshopId} readOnly />
      </div>
    </RoleLayout>
  );
}
