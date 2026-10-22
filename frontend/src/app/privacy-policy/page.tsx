"use client";

import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useLocale } from "@/i18n/LocaleContext";

// Public build-time setting; shown on the page when configured.
const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim();

/** Public privacy policy (needed for Google login). Draft text: have it legally reviewed before launch. */
export default function PrivacyPolicyPage() {
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.privacy.title")}</h1>
        <p role="note" className="text-[11px] font-bold text-[#790166] bg-[#FAE2F0] rounded-xl px-3 py-2">{t("manage.privacy.draft")}</p>
        <p className="text-[11px] text-[#B7B7B7]">{t("manage.privacy.updated")}</p>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.who.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.who.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.data.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.data.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.why.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.why.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.share.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.share.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.keep.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.keep.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.rights.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.rights.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.security.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.security.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.changes.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.privacy.changes.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.privacy.contactTitle")}</h2>
            {SUPPORT_EMAIL ? (
              <>
                <p className="text-xs text-[#555555] mb-2">{t("manage.privacy.contactBody")}</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 text-xs font-bold text-[#FA1EFF] hover:underline">
                  <Mail className="w-4 h-4" /> {SUPPORT_EMAIL}
                </a>
              </>
            ) : (
              <p className="text-xs text-[#555555]">{t("manage.privacy.contactNone")}</p>
            )}
          </section>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-bold text-[#FA1EFF]">
          <Link href="/terms" className="hover:underline">{t("manage.privacy.terms")}</Link>
          <Link href="/data-deletion" className="hover:underline">{t("manage.privacy.deletionLink")}</Link>
        </div>
      </div>
    </RoleLayout>
  );
}
