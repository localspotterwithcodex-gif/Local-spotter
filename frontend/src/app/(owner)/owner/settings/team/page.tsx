"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function TeamPage() {
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const { business, loading: bLoading, error: bError, reload: bReload } = useMyBusiness();
  const team = useApiResource(business ? `team:${business.id}` : null, () => api.getEmployees(business!.id));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "STAFF">("STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.inviteEmployee(business.id, email.trim(), role);
      setEmail("");
      setNotice(t("team.sent"));
      team.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!business) return;
    setError("");
    try {
      await api.revokeEmployee(business.id, id);
      team.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (bLoading) return <OwnerLayout><LoadingState /></OwnerLayout>;
  if (bError) return <OwnerLayout><ErrorState message={bError} onRetry={bReload} /></OwnerLayout>;
  if (!business) return <OwnerLayout><EmptyState title={t("ownerx.noShop.title")} description="" /></OwnerLayout>;

  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto space-y-4">
        <Link href="/owner/settings" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" /> {t("manage.nav.settings")}
        </Link>
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("team.title")}</h1>
        <p className="text-xs text-[#555555]">{t("team.intro")}</p>

        <form onSubmit={invite} className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
          <Input label={t("team.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="space-y-1.5">
            <label htmlFor="team-role" className="text-sm font-bold text-[#111111]">{t("team.role")}</label>
            <select
              id="team-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "MANAGER" | "STAFF")}
              className="h-11 w-full bg-white border border-[#EAEAEA] rounded-xl text-sm px-3"
            >
              <option value="STAFF">{t("staff.roleStaff")}</option>
              <option value="MANAGER">{t("staff.roleManager")}</option>
            </select>
          </div>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          {notice && <p role="status" className="text-xs text-[#3B9B52]">{notice}</p>}
          <Button type="submit" variant="primary" isLoading={busy}>{t("team.invite")}</Button>
        </form>

        {team.loading ? (
          <LoadingState />
        ) : team.error ? (
          <ErrorState message={team.error} onRetry={team.reload} />
        ) : (team.data ?? []).length === 0 ? (
          <EmptyState title={t("team.empty")} description="" />
        ) : (
          <ul className="space-y-2">
            {(team.data ?? []).map((m) => (
              <li key={m.id} className="bg-white rounded-2xl border border-[#EAEAEA] p-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-[#121F3E] truncate">{m.email}</p>
                  <p className="text-[#B7B7B7]">
                    {m.role === "MANAGER" ? t("staff.roleManager") : t("staff.roleStaff")} ·{" "}
                    {m.status === "ACTIVE" ? t("team.active") : t("team.pending", { date: m.inviteExpiresAt ? f.date(m.inviteExpiresAt) : "" })}
                  </p>
                </div>
                <button type="button" onClick={() => revoke(m.id)} aria-label={t("team.revoke")} className="p-2 text-red-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OwnerLayout>
  );
}
