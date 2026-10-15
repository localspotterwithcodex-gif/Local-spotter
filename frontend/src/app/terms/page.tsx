"use client";

import React from "react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useLocale } from "@/i18n/LocaleContext";

/** Terms & privacy policy. Draft text: must be reviewed by a legal adviser before launch. */
export default function TermsPage() {
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.terms.title")}</h1>
        <p role="note" className="text-[11px] font-bold text-[#790166] bg-[#FAE2F0] rounded-xl px-3 py-2">{t("manage.terms.draft")}</p>
        <p className="text-[11px] text-[#B7B7B7]">{t("manage.terms.updated")}</p>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.about.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.about.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.accounts.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.accounts.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.orders.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.orders.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.returns.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.returns.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.shops.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.shops.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.use.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.use.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.privacy.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.privacy.body")}</p>
          </section>
          <section>
            <h2 className="text-sm font-bold text-[#121F3E] mb-1">{t("manage.terms.liability.title")}</h2>
            <p className="text-xs leading-relaxed text-[#555555]">{t("manage.terms.liability.body")}</p>
          </section>
        </div>
      </div>
    </RoleLayout>
  );
}
