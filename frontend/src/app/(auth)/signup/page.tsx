"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Phone } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { routeForRole } from "@/lib/auth/redirect";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { ApiError } from "@/lib/api/client";

// Format check only; the API also checks that the domain can receive mail (e.g. rejects "gmial.con").
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/;

/** Same rule as the API: +country code, 00country code, or a Dutch 06 number. */
function hasCountryCode(value: string) {
  const v = value.trim().replace(/[\s().-]/g, "");
  return /^(\+|00)[1-9]\d{7,14}$/.test(v) || /^06\d{8}$/.test(v);
}

type Step = "form" | "verify";

const RESEND_COOLDOWN_S = 60;

/**
 * Everyone signs up as a customer: name, mobile number (verified with an SMS code),
 * e-mail address and password. Customers can turn their account into a shop-owner
 * account later from their profile ("Become a shop owner").
 */
export default function SignupPage() {
  const router = useRouter();
  const { register, verifyCode, resendCode, pendingVerification } = useAuth();
  const { t } = useLocale();
  const errMsg = useErrorMessage();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Field-level messages, shown under the field itself.
  const [mobileError, setMobileError] = useState("");
  const [emailError, setEmailError] = useState("");
  // Seconds until "Resend code" unlocks (the API enforces the same 60 s).
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMobileError("");
    setEmailError("");
    if (!name.trim() || !mobile.trim() || !email.trim() || !password) {
      setError(t("authx.signup.fillRequired"));
      return;
    }
    if (!hasCountryCode(mobile)) {
      setMobileError(t("authx.signup.phoneFormat"));
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t("authx.signup.emailInvalid"));
      return;
    }
    if (password.length < 8) {
      setError(t("authx.signup.passwordShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("authx.signup.mismatch"));
      return;
    }
    if (!acceptTerms) {
      setError(t("authx.signup.acceptRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email: email.trim(), phone: mobile.trim(), password, role: "CONSUMER", displayName: name.trim(), acceptTerms: true });
      setStep("verify");
      setResendIn(RESEND_COOLDOWN_S);
    } catch (err) {
      const errCode = err instanceof ApiError ? (err.body as { code?: string } | null)?.code : undefined;
      if (errCode === "EMAIL_INVALID") setEmailError(t("authx.signup.emailInvalid"));
      else if (errCode === "PHONE_FORMAT") setMobileError(t("authx.signup.phoneFormat"));
      else setError(errMsg(err, { conflict: "authx.signup.exists", unavailable: "authx.signup.smsUnavailable", unknown: "authx.signup.failed" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError(t("authx.signup.enterCode"));
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyCode(code);
      router.push("/products");
    } catch (err) {
      setError(errMsg(err, { unauthorized: "authx.signup.invalidCode", validation: "authx.signup.invalidCode", notFound: "authx.signup.invalidCode" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div>
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-[44px] leading-none font-extrabold font-rubik text-black">{t("auth.hi")}</h1>
            <p className="text-xs text-[#111111]">
              {step === "verify" ? t("authx.signup.verifyTitle") : t("auth.createAccount")}
            </p>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label={t("auth.fullName")}
                placeholder={t("authx.signup.namePlaceholder")}
                autoComplete="name"
                icon={<User className="w-4 h-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={t("authx.signup.mobileLabel")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+31 6 12345678"
                icon={<Phone className="w-4 h-4" />}
                value={mobile}
                error={mobileError}
                helperText={t("authx.signup.mobileHelp")}
                onChange={(e) => setMobile(e.target.value)}
              />

              <Input
                label={t("authx.signup.emailLabel")}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t("authx.signup.emailPlaceholder")}
                icon={<Mail className="w-4 h-4" />}
                value={email}
                error={emailError}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label={t("auth.password")}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                label={t("auth.confirmPassword")}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <label className="flex items-start gap-2 text-xs text-[#555555]">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 accent-[#FA1EFF]"
                />
                <span>
                  {t("authx.signup.acceptPrefix")}{" "}
                  <Link href="/terms" target="_blank" className="font-bold text-ls-accent-text hover:underline">{t("authx.signup.terms")}</Link>{" "}
                  {t("authx.signup.and")}{" "}
                  <Link href="/privacy-policy" target="_blank" className="font-bold text-ls-accent-text hover:underline">{t("authx.signup.privacy")}</Link>.
                </span>
              </label>

              <Button type="submit" variant="primary" className={authButtonClass} isLoading={isSubmitting}>
                {t("auth.signUp")}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-ls-muted text-center">
                {t("authx.signup.codeSent")}{" "}
                <strong className="text-[#111111]">{pendingVerification?.identifier}</strong> {t("authx.signup.via")}{" "}
                {pendingVerification?.channel === "EMAIL" ? t("authx.signup.channelEmail") : t("authx.signup.channelSms")}.
              </p>
              <Input
                label={t("authx.signup.codeLabel")}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button type="submit" variant="primary" className={authButtonClass} isLoading={isSubmitting}>
                {t("authx.signup.confirm")}
              </Button>
              <button
                type="button"
                disabled={resendIn > 0}
                onClick={() => {
                  setResendIn(RESEND_COOLDOWN_S);
                  void resendCode();
                }}
                className="w-full text-xs font-bold text-ls-accent-text hover:underline text-center disabled:text-ls-muted disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendIn > 0 ? t("authx.signup.resendIn", { s: resendIn }) : t("authx.signup.resend")}
              </button>
            </form>
          )}

          {step === "form" && (
            <SocialButtons
              onSuccess={(user) => router.push(routeForRole(user.role))}
              onError={setError}
            />
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-ls-muted">
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="font-bold text-ls-accent-text hover:underline">
                {t("auth.logInHere")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
