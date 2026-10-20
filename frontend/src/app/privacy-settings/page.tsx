"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";

/** Data export and account deletion (GDPR) for every signed-in role. */
export default function PrivacySettingsPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.deleteMyAccount(confirm, password || undefined);
      logout();
      router.push("/login");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleLayout>
      <div className="max-w-[560px] mx-auto space-y-6">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("privacySettings.title")}</h1>

        <section className="bg-white rounded-2xl border border-[#EAEAEA] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#111111]">{t("privacySettings.exportTitle")}</h2>
          <p className="text-xs text-[#555555]">{t("privacySettings.exportDesc")}</p>
          <a href="/api/v1/account/export" download>
            <Button variant="secondary" type="button">
              <Download className="w-4 h-4 mr-1" /> {t("privacySettings.exportButton")}
            </Button>
          </a>
        </section>

        <section className="bg-white rounded-2xl border border-[#F2D9DE] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#E54666]">{t("privacySettings.deleteTitle")}</h2>
          <p className="text-xs text-[#555555]">{t("privacySettings.deleteDesc")}</p>
          <form onSubmit={remove} className="space-y-3">
            <Input label={t("privacySettings.password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label={t("privacySettings.typeDelete")} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            <Button type="submit" variant="primary" isLoading={busy} disabled={confirm !== "DELETE"}>
              {t("privacySettings.deleteButton")}
            </Button>
          </form>
        </section>
      </div>
    </RoleLayout>
  );
}
