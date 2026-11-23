"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const router = useRouter();
  const errMsg = useErrorMessage();
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    setIsLoading(true);
    try {
      // The backend answers identically whether or not the account exists (SMS code or e-mail link).
      await apiClient.post("/auth/forgot-password", { identifier: identifier.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(errMsg(err, { unavailable: "authx.signup.emailUnavailable", unknown: "authx.forgot.sendFailed" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { resetToken } = await apiClient.post<{ resetToken: string }>("/auth/forgot-password/verify", { identifier: identifier.trim(), code: code.trim() });
      router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`);
    } catch (err) {
      setError(errMsg(err, { validation: "manage.mfa.invalid", unauthorized: "manage.mfa.invalid" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <Link href="/login" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-ls-muted hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("authx.forgot.backToLogin")}
        </Link>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("authx.forgot.title")}</h1>
          <p className="text-xs text-ls-muted">{t("authx.forgot.subtitle")}</p>
        </div>

        {error && <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">{error}</div>}

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#CBF5D5] text-[#3B9B52] rounded-2xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 mx-auto" />
              <h3 className="text-sm font-bold">{t("authx.reset.codeTitle")}</h3>
              <p className="text-xs">{t("authx.reset.codePrompt")}</p>
            </div>
            <form onSubmit={handleCode} className="space-y-4">
              <Input
                label={t("authx.sms.code")}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="123456"
                icon={<ShieldCheck className="w-4 h-4" />}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button type="submit" variant="primary" className={authButtonClass} isLoading={isLoading} disabled={code.length !== 6}>
                {t("authx.reset.verify")}
              </Button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("authx.reset.identifier")}
              type="text"
              autoComplete="username"
              placeholder={t("authx.forgot.emailPlaceholder")}
              icon={<Mail className="w-4 h-4" />}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className={authButtonClass} isLoading={isLoading}>
              {t("authx.forgot.submit")}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
