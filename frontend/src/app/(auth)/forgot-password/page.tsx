"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    setIsLoading(true);
    try {
      // The backend answers identically whether or not the address exists.
      await apiClient.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(errMsg(err, { unavailable: "authx.signup.emailUnavailable", unknown: "authx.forgot.sendFailed" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <Link href="/login" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("authx.forgot.backToLogin")}
        </Link>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("authx.forgot.title")}</h1>
          <p className="text-xs text-[#B7B7B7]">
            {t("authx.forgot.subtitle")}
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-[#CBF5D5] text-[#3B9B52] rounded-2xl text-center space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto" />
            <h3 className="text-sm font-bold">{t("authx.forgot.sentTitle")}</h3>
            <p className="text-xs">
              {t("authx.forgot.sentText")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">{error}</div>
            )}
            <Input
              label={t("authx.forgot.emailLabel")}
              type="email"
              placeholder={t("authx.forgot.emailPlaceholder")}
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
