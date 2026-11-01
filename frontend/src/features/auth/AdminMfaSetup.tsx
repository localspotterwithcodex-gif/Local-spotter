"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/**
 * Shown in place of the admin portal until the admin has turned on two-step verification:
 * the API refuses every admin action for sessions without the second factor.
 */
export const AdminMfaSetup: React.FC = () => {
  const { reloadUser } = useAuth();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const start = () => run(async () => setSetup(await apiClient.post("/auth/mfa/setup")));
  const enable = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await apiClient.post<{ recoveryCodes: string[] }>("/auth/mfa/enable", { code: code.trim() });
      setRecoveryCodes(res.recoveryCodes);
    });
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white rounded-2xl border border-[#EAEAEA] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-[#790166]" aria-hidden="true" />
        <h1 className="text-base font-bold font-rubik text-[#111111]">
          {recoveryCodes ? t("manage.mfa.recoveryTitle") : t("manage.mfa.setupTitle")}
        </h1>
      </div>

      {error && <p role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl">{error}</p>}

      {recoveryCodes ? (
        <>
          <p className="text-xs text-[#555555]">{t("manage.mfa.recoveryIntro")}</p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm text-[#111111] bg-[#F9F9F9] rounded-xl p-3">
            {recoveryCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button type="button" variant="primary" className="w-full" onClick={() => void reloadUser()}>
            {t("manage.mfa.done")}
          </Button>
        </>
      ) : setup ? (
        <form onSubmit={enable} className="space-y-4">
          <p className="text-xs text-[#555555]">{t("manage.mfa.setupIntro")}</p>
          <div>
            <span className="block text-xs font-bold text-[#111111] mb-1">{t("manage.mfa.secret")}</span>
            <code className="block break-all bg-[#F9F9F9] rounded-xl p-3 text-sm text-[#111111] select-all">{setup.secret}</code>
            <a href={setup.otpauthUrl} className="inline-block mt-2 text-xs font-bold text-ls-accent-text hover:underline">
              {t("manage.mfa.openApp")}
            </a>
          </div>
          <Input
            label={t("manage.mfa.code")}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full" isLoading={busy} disabled={!/^\d{6}$/.test(code.trim())}>
            {t("manage.mfa.enable")}
          </Button>
        </form>
      ) : (
        <>
          <p className="text-xs text-[#555555]">{t("manage.mfa.setupIntro")}</p>
          <Button type="button" variant="primary" className="w-full" isLoading={busy} onClick={() => void start()}>
            {t("manage.mfa.start")}
          </Button>
        </>
      )}
    </div>
  );
};
