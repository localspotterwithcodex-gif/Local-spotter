"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type AdminChatReport } from "@/lib/api/admin";
import type { TranslationKey } from "@/i18n/dictionaries";

const REASON_KEY: Record<AdminChatReport["reason"], TranslationKey> = {
  SPAM: "adminx.chat.reason.SPAM",
  HARASSMENT: "adminx.chat.reason.HARASSMENT",
  FRAUD: "adminx.chat.reason.FRAUD",
  INAPPROPRIATE: "adminx.chat.reason.INAPPROPRIATE",
  OTHER: "adminx.chat.reason.OTHER",
};
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

export default function AdminChatReportsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const [status, setStatus] = useState<"OPEN" | "RESOLVED" | "DISMISSED">("OPEN");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, error, loading, reload } = useApiResource(`admin-chat-reports-${status}`, () => adminApi.getChatReports(status));
  const action = useAdminAction(reload);
  const reports = data ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA] flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.chatReports")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.chat.subtitle")}</p>
          </div>
          <select
            aria-label={t("adminx.chat.filter")}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="h-10 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3"
          >
            <option value="OPEN">{t("adminx.chat.open")}</option>
            <option value="RESOLVED">{t("adminx.chat.resolved")}</option>
            <option value="DISMISSED">{t("adminx.chat.dismissed")}</option>
          </select>
        </div>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : reports.length === 0 ? (
          <EmptyState title={t("adminx.chat.emptyTitle")} description={t("adminx.chat.emptyDesc")} />
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#111111]">
                    {r.businessName} · {r.consumerName}
                  </span>
                  <span className="text-[#B7B7B7]">
                    {t(REASON_KEY[r.reason])} · {f.date(r.createdAt)}
                  </span>
                </div>
                {r.messageSnapshot !== null && (
                  <blockquote className="bg-[#F9F9F9] rounded-xl p-3 text-[#111111] whitespace-pre-wrap break-words">
                    {r.messageSnapshot || "—"}
                  </blockquote>
                )}
                {r.details && <p className="text-[#555555]">{r.details}</p>}
                <p className="text-[#B7B7B7]">{t("adminx.chat.reportedBy", { email: r.reporterEmail ?? "—" })}</p>
                {r.status === "OPEN" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={notes[r.id] ?? ""}
                      maxLength={1000}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder={t("adminx.chat.notePlaceholder")}
                      aria-label={t("adminx.chat.notePlaceholder")}
                      className="flex-1 min-w-[180px] h-9 bg-[#EAEAEA] rounded-xl px-3"
                    />
                    <button
                      disabled={action.busyId !== null}
                      onClick={() => action.run(r.id, () => adminApi.resolveChatReport(r.id, "RESOLVED", notes[r.id]))}
                      className="font-bold text-[#3B9B52] disabled:opacity-50"
                    >
                      {t("adminx.chat.resolve")}
                    </button>
                    <button
                      disabled={action.busyId !== null}
                      onClick={() => action.run(r.id, () => adminApi.resolveChatReport(r.id, "DISMISSED", notes[r.id]))}
                      className="font-bold text-[#555555] disabled:opacity-50"
                    >
                      {t("adminx.chat.dismiss")}
                    </button>
                  </div>
                ) : (
                  r.resolutionNote && <p className="text-[#555555]">{r.resolutionNote}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
