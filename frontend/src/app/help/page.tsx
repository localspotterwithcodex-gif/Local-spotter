"use client";

import React from "react";
import { ChevronDown, Mail } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { useLocale } from "@/i18n/LocaleContext";

// Public build-time setting; the contact block is hidden when it is not configured.
const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim();

export default function HelpPage() {
  const { t } = useLocale();
  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.help.title")}</h1>
          <p className="text-xs text-[#B7B7B7] mt-1">{t("manage.help.intro")}</p>
        </div>
        <div className="space-y-3">
          <details key="order" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.order.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.order.a")}</p>
          </details>
          <details key="track" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.track.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.track.a")}</p>
          </details>
          <details key="chat" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.chat.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.chat.a")}</p>
          </details>
          <details key="follow" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.follow.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.follow.a")}</p>
          </details>
          <details key="language" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.language.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.language.a")}</p>
          </details>
          <details key="password" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.password.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.password.a")}</p>
          </details>
          <details key="owner" className="bg-white rounded-xl shadow-sm px-4 py-3 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-xs font-bold text-[#121F3E]">
              {t("manage.help.owner.q")}
              <ChevronDown className="w-4 h-4 text-[#B7B7B7] transition-transform group-open:rotate-180 shrink-0" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-[#555555]">{t("manage.help.owner.a")}</p>
          </details>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-2">
          <h2 className="text-sm font-bold text-[#121F3E]">{t("manage.help.contactTitle")}</h2>
          {SUPPORT_EMAIL ? (
            <>
              <p className="text-xs text-[#555555]">{t("manage.help.contactBody")}</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#FA1EFF] text-white text-xs font-bold"
              >
                <Mail className="w-4 h-4" /> {t("manage.help.emailUs")}
              </a>
            </>
          ) : (
            <p className="text-xs text-[#555555]">{t("manage.help.contactNone")}</p>
          )}
        </div>
      </div>
    </RoleLayout>
  );
}
