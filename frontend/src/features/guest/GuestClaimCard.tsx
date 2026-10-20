"use client";

import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/** Offered to guests after a purchase: confirm the e-mail with a code and choose a password. */
export function GuestClaimCard() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { user, reloadUser } = useAuth();
  const [step, setStep] = useState<"idle" | "code" | "done">("idle");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user?.isGuest && step !== "done") return null;
  if (step === "done") {
    return (
      <div role="status" className="bg-[#CBF5D5]/60 border border-[#3B9B52]/30 text-[#2F7A42] text-xs font-bold rounded-2xl p-4">
        {t("guest.claim.done")}
      </div>
    );
  }

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      await api.startGuestClaim();
      setStep("code");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.completeGuestClaim(code.trim(), password);
      setStep("done");
      await reloadUser();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
      <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#FA1EFF]" /> {t("guest.claim.title")}
      </h3>
      <p className="text-xs text-[#555555]">{t("guest.claim.intro")}</p>
      {step === "idle" ? (
        <Button variant="primary" isLoading={busy} onClick={() => void start()}>
          {t("guest.claim.start")}
        </Button>
      ) : (
        <form onSubmit={complete} className="space-y-3">
          <p className="text-[11px] text-[#B7B7B7]">{t("guest.claim.codeSent")}</p>
          <Input label={t("guest.claim.code")} inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          <Input label={t("guest.claim.password")} type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" isLoading={busy}>{t("guest.claim.complete")}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-xs text-[#ED4C5C]">{error}</p>}
    </div>
  );
}
