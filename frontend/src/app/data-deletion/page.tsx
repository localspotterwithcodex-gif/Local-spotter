"use client";

import React from "react";
import { Mail } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useLocale } from "@/i18n/LocaleContext";

const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim();

/** Public data-deletion instructions (linked from the sign-in pages). Requests are handled by email, manually. */
export default function DataDeletionPage() {
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.deletion.title")}</h1>
          <p className="text-xs text-[#B7B7B7] mt-1">{t("manage.deletion.intro")}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.deletion.step1.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.deletion.step1.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.deletion.step2.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.deletion.step2.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.deletion.step3.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.deletion.step3.body")}</p>
          </section>
        </div>
        {SUPPORT_EMAIL ? (
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my data")}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#FA1EFF] text-white text-xs font-bold"
          >
            <Mail className="w-4 h-4" /> {t("manage.deletion.emailUs")}
          </a>
        ) : (
          <p className="text-xs text-[#555555]">{t("manage.deletion.contactNone")}</p>
        )}
      </div>
    </RoleLayout>
  );
}
