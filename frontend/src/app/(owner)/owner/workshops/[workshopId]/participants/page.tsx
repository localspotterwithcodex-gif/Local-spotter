"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { WorkshopParticipantsView } from "@/features/owner/WorkshopParticipantsView";
import { useLocale } from "@/i18n/LocaleContext";

export default function WorkshopParticipantsPage({ params }: { params: Promise<{ workshopId: string }> }) {
  const { workshopId } = use(params);
  const { t } = useLocale();
  return (
    <OwnerLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/owner/workshops" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("owner.myWorkshops")}
        </Link>
        <WorkshopParticipantsView workshopId={workshopId} />
      </div>
    </OwnerLayout>
  );
}
