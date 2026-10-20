"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/** First checkout step for a visitor without account: contact details + consent, then a guest session starts. */
export function GuestContactStep({ onStarted }: { onStarted: (contact: { name: string; phone: string }) => void }) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { startGuest } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) {
      setError(t("authx.signup.acceptRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await startGuest({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, acceptTerms: true });
      onStarted({ name: name.trim(), phone: phone.trim() });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center mx-auto mb-2">
          <UserRound className="w-6 h-6" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">{t("guest.title")}</h1>
        <p className="text-xs text-[#B7B7B7]">{t("guest.subtitle")}</p>
      </div>

      <form onSubmit={submit} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
        <Input label={t("guest.name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80} />
        <Input label={t("guest.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={254} />
        <Input label={t("guest.phone")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} />

        <label className="flex items-start gap-2 text-xs text-[#555555] cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#FA1EFF]" />
          <span>
            {t("authx.signup.acceptPrefix")}{" "}
            <Link href="/terms" target="_blank" className="font-bold text-[#FA1EFF] underline">{t("authx.signup.terms")}</Link>{" "}
            {t("authx.signup.and")}{" "}
            <Link href="/privacy-policy" target="_blank" className="font-bold text-[#FA1EFF] underline">{t("authx.signup.privacy")}</Link>
          </span>
        </label>

        {error && <p role="alert" className="text-xs text-[#ED4C5C]">{error}</p>}

        <Button type="submit" variant="primary" size="lg" fullWidth isLoading={busy}>
          {t("guest.continue")}
        </Button>
        <p className="text-[11px] text-[#B7B7B7] text-center">{t("guest.note")}</p>
        <p className="text-xs text-center text-[#555555]">
          {t("guest.haveAccount")}{" "}
          <Link href="/login?redirectTo=/checkout" className="font-bold text-[#FA1EFF] underline">{t("guest.login")}</Link>
        </p>
      </form>
    </div>
  );
}
