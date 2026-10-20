"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/** Participant list for one workshop. `readOnly` hides the session-cancel controls (employees). */
export function WorkshopParticipantsView({ workshopId, readOnly = false }: { workshopId: string; readOnly?: boolean }) {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const [sessionId, setSessionId] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const workshop = useApiResource(`owner-workshop:${workshopId}`, () => api.getWorkshopById(workshopId));
  const people = useApiResource(`owner-participants:${workshopId}:${sessionId}`, () =>
    api.getWorkshopParticipants(workshopId, sessionId || undefined)
  );

  const sessions = workshop.data?.sessions ?? [];
  const csvHref = `/api/v1/workshops/${workshopId}/participants.csv${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`;

  const cancelSession = async (id: string) => {
    setActionError("");
    try {
      await api.cancelWorkshopSession(workshopId, id);
      setConfirming(null);
      workshop.reload();
      people.reload();
    } catch (err) {
      setActionError(errMsg(err));
    }
  };

  return (
    <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-bold font-rubik text-[#111111]">
        {t("ownerx.participants.title")}
        {people.data?.title ? ` · ${people.data.title}` : ""}
      </h1>
      <a href={csvHref} download>
        <Button size="sm" variant="secondary">
          <Download className="w-4 h-4 mr-1" /> {t("ownerx.participants.csv")}
        </Button>
      </a>
    </div>

    {sessions.length > 0 && (
      <div className="bg-white rounded-2xl border border-[#EAEAEA] p-3 space-y-2">
        <label className="text-xs font-bold text-[#111111] block" htmlFor="session-filter">
          {t("ownerx.participants.session")}
        </label>
        <select
          id="session-filter"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="h-10 w-full bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
        >
          <option value="">{t("ownerx.participants.allSessions")}</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {f.date(s.date)} {s.startTime}–{s.finishTime} ({s.bookedCount}/{s.capacity}){s.status === "CANCELLED" ? ` · ${t("ownerx.participants.cancelled")}` : ""}
            </option>
          ))}
        </select>
        {!readOnly && sessionId && sessions.find((s) => s.id === sessionId)?.status !== "CANCELLED" && (
          <div className="flex items-center gap-2">
            {confirming === sessionId ? (
              <>
                <span className="text-xs text-[#555555]">{t("ownerx.participants.confirmCancel")}</span>
                <Button size="sm" variant="primary" onClick={() => cancelSession(sessionId)}>
                  {t("ownerx.participants.yesCancel")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  {t("ownerx.workshopNew.cancel")}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirming(sessionId)}>
                {t("ownerx.participants.cancelSession")}
              </Button>
            )}
          </div>
        )}
        {actionError && <p role="alert" className="text-xs text-red-600">{actionError}</p>}
      </div>
    )}

    {people.loading ? (
      <LoadingState />
    ) : people.error ? (
      <ErrorState message={people.error} onRetry={people.reload} />
    ) : (people.data?.data ?? []).length === 0 ? (
      <EmptyState title={t("ownerx.participants.empty")} description="" />
    ) : (
      <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[#B7B7B7]">
              <th className="p-3">{t("ownerx.participants.colName")}</th>
              <th className="p-3">{t("ownerx.participants.colPhone")}</th>
              <th className="p-3">{t("ownerx.participants.colTickets")}</th>
              <th className="p-3">{t("ownerx.participants.colTotal")}</th>
              <th className="p-3">{t("ownerx.participants.colSession")}</th>
            </tr>
          </thead>
          <tbody>
            {people.data!.data.map((p) => (
              <tr key={p.bookingId} className="border-t border-[#F3F3F3]">
                <td className="p-3 font-bold text-[#111111]">{p.name}</td>
                <td className="p-3">{p.phone ?? "—"}</td>
                <td className="p-3">{p.tickets}</td>
                <td className="p-3">{f.currency(p.total)}</td>
                <td className="p-3">{p.sessionStart ? f.date(p.sessionStart) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    </div>
  );
}
