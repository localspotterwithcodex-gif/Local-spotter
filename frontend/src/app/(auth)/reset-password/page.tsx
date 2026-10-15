"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

function ResetPasswordForm() {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // Password validation rules
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.exec(password) !== null;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("authx.reset.invalidLink"));
      return;
    }
    if (!hasMinLength) {
      setError(t("authx.reset.minLength"));
      return;
    }
    if (!passwordsMatch) {
      setError(t("authx.signup.mismatch"));
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { token, newPassword: password });
      setIsSuccess(true);
    } catch (err) {
      setError(errMsg(err, { validation: "authx.reset.invalidLink", notFound: "authx.reset.invalidLink", unknown: "authx.reset.failed" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center mx-auto mb-2">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold font-rubik text-[#111111]">
          {t("authx.reset.title")}
        </h1>
        <p className="text-xs text-[#B7B7B7]">
          {t("authx.reset.subtitle")}
        </p>
      </div>

      {isSuccess ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#111111] font-rubik">
              {t("authx.reset.doneTitle")}
            </h2>
            <p className="text-xs text-[#B7B7B7]">
              {t("authx.reset.doneText")}
            </p>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push("/login")}
            className="gap-2 mt-4"
          >
            {t("authx.reset.toLogin")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-[#F2D9DE] border border-[#E54666] rounded-xl text-xs text-[#E54666] font-medium">
              {error}
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1 relative">
            <Input
              label={t("authx.reset.newPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t("authx.reset.hide") : t("authx.reset.show")}
              className="absolute right-3 top-[38px] text-[#B7B7B7] hover:text-[#111111] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1 relative">
            <Input
              label={t("authx.reset.confirmNew")}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? t("authx.reset.hide") : t("authx.reset.show")}
              className="absolute right-3 top-[38px] text-[#B7B7B7] hover:text-[#111111] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-2 text-xs">
            <span className="font-bold text-[#111111] block mb-1">{t("authx.reset.requirements")}</span>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={hasMinLength ? "text-[#111111]" : "text-[#B7B7B7]"}>{t("authx.reset.ruleLength")}</span>
            </div>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasNumber ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={hasNumber ? "text-[#111111]" : "text-[#B7B7B7]"}>{t("authx.reset.ruleNumber")}</span>
            </div>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={passwordsMatch ? "text-[#111111]" : "text-[#B7B7B7]"}>{t("authx.reset.ruleMatch")}</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            className="mt-4"
          >
            {t("authx.reset.submit")}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-[#FA1EFF] hover:underline font-bold"
            >
              {t("authx.reset.backToLogin")}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLocale();
  return (
    <AuthShell>
      <Suspense fallback={
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111111]">{t("common.loading")}</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
