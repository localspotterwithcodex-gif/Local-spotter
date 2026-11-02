"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Check, CheckCircle2 } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { routeForRole } from "@/lib/auth/redirect";
import { useAuth } from "@/features/auth/AuthContext";
import { PASSWORD_RULES, emailLooksValid, fullMobile, mobileLooksValid, passwordOk } from "@/features/auth/signupRules";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { ApiError, apiClient } from "@/lib/api/client";

/** Netherlands first (default); the rest lets international numbers sign up. */
const COUNTRIES = [
  ["NL", "+31"], ["BE", "+32"], ["DE", "+49"], ["FR", "+33"], ["GB", "+44"], ["ES", "+34"], ["IT", "+39"],
  ["PL", "+48"], ["TR", "+90"], ["MA", "+212"], ["SR", "+597"], ["IN", "+91"], ["US", "+1"],
] as const;

const RESEND_COOLDOWN_S = 60;

const EXISTS_MESSAGES = {
  EMAIL_EXISTS: "authx.signup.emailExists",
  MOBILE_EXISTS: "authx.signup.mobileExists",
  ACCOUNT_EXISTS: "authx.signup.accountExists",
} as const;

type Notice = { kind: "ok" | "error"; text: string } | null;

const apiCode = (err: unknown) => (err instanceof ApiError ? (err.body as { code?: string } | null)?.code : undefined);

/**
 * Everyone signs up as a customer (shop owners switch later from their profile):
 * name, e-mail, mobile number verified by SMS code, then a password. The API
 * re-checks everything; the form state only drives the UI.
 */
export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useLocale();
  const errMsg = useErrorMessage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+31");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Phone verification
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [phoneNotice, setPhoneNotice] = useState<Notice>(null);

  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mobile = fullMobile(dialCode, localNumber);
  const phoneVerified = verificationToken !== "";
  const confirmMismatch = confirmPassword !== "" && confirmPassword !== password;
  const canSubmit =
    name.trim() !== "" && emailLooksValid(email) && phoneVerified && passwordOk(password) && password === confirmPassword && acceptTerms;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  /** A changed number needs a new code. */
  const resetPhone = () => {
    setOtpSent(false);
    setOtp("");
    setVerificationToken("");
    setPhoneNotice(null);
  };

  const sendOtp = async () => {
    setPhoneNotice(null);
    if (!mobileLooksValid(mobile)) {
      setPhoneNotice({ kind: "error", text: t("authx.signup.phoneFormat") });
      return;
    }
    setSending(true);
    try {
      const res = await apiClient.post<{ phone: string; resendAfterSeconds: number }>("/auth/signup/phone/send", { phone: mobile });
      setOtpSent(true);
      setOtp("");
      setResendIn(res.resendAfterSeconds ?? RESEND_COOLDOWN_S);
      setPhoneNotice({ kind: "ok", text: t("authx.signup.otpSent", { phone: res.phone }) });
    } catch (err) {
      const code = apiCode(err);
      if (code === "OTP_COOLDOWN") {
        const wait = (err as ApiError & { body: { retryAfterSeconds?: number } }).body.retryAfterSeconds ?? RESEND_COOLDOWN_S;
        setResendIn(wait);
        setPhoneNotice({ kind: "error", text: t("authx.signup.otpCooldown", { s: wait }) });
      } else if (code === "OTP_LIMIT") setPhoneNotice({ kind: "error", text: t("authx.signup.otpLimit") });
      else if (code === "PHONE_FORMAT") setPhoneNotice({ kind: "error", text: t("authx.signup.phoneFormat") });
      else setPhoneNotice({ kind: "error", text: errMsg(err, { unavailable: "authx.signup.smsUnavailable", unknown: "authx.signup.failed" }) });
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    setPhoneNotice(null);
    if (otp.length !== 6) {
      setPhoneNotice({ kind: "error", text: t("authx.signup.enterCode") });
      return;
    }
    setVerifying(true);
    try {
      const res = await apiClient.post<{ verificationToken: string }>("/auth/signup/phone/verify", { phone: mobile, code: otp });
      setVerificationToken(res.verificationToken);
      setPhoneNotice({ kind: "ok", text: t("authx.signup.phoneVerified") });
    } catch (err) {
      const code = apiCode(err);
      setPhoneNotice({
        kind: "error",
        text: code === "OTP_ATTEMPTS" ? t("authx.signup.otpAttempts") : code === "OTP_INVALID" ? t("authx.signup.otpInvalid") : errMsg(err, { unknown: "authx.signup.failed" }),
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setShowLoginLink(false);
    if (!canSubmit) {
      if (!phoneVerified) setPhoneNotice({ kind: "error", text: t("authx.signup.phoneNotVerified") });
      else if (!emailLooksValid(email)) setEmailError(t("authx.signup.emailInvalid"));
      else setError(t("authx.signup.fillRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await register({
        email: email.trim(),
        phone: mobile,
        password,
        role: "CONSUMER",
        displayName: name.trim(),
        acceptTerms: true,
        phoneVerificationToken: verificationToken,
      });
      setSuccess(true);
      window.setTimeout(() => router.push(routeForRole(user.role)), 1200);
    } catch (err) {
      const code = apiCode(err);
      const exists = code && code in EXISTS_MESSAGES ? EXISTS_MESSAGES[code as keyof typeof EXISTS_MESSAGES] : null;
      if (exists) {
        setError(t(exists));
        setShowLoginLink(true);
      } else if (code === "EMAIL_INVALID") setEmailError(t("authx.signup.emailInvalid"));
      else if (code === "PHONE_NOT_VERIFIED") {
        resetPhone();
        setPhoneNotice({ kind: "error", text: t("authx.signup.phoneNotVerified") });
      } else setError(errMsg(err, { conflict: "authx.signup.exists", unknown: "authx.signup.failed" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendLabel = resendIn > 0 ? t("authx.signup.resendOtpIn", { s: resendIn }) : otpSent ? t("authx.signup.resendOtp") : t("authx.signup.sendOtp");

  return (
    <AuthShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-[44px] leading-none font-extrabold font-rubik text-black">{t("auth.hi")}</h1>
          <p className="text-xs text-[#111111]">{t("auth.createAccount")}</p>
        </div>

        {success && (
          <div role="status" className="p-3 bg-[#DDF3E4] text-[#1E7B3C] text-xs font-bold rounded-xl text-center">
            {t("authx.signup.success")}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
            {error}{" "}
            {showLoginLink && (
              <Link href="/login" className="underline text-ls-accent-text">
                {t("authx.signup.logInLink")}
              </Link>
            )}
          </div>
        )}

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
            label={t("authx.signup.emailLabel")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("authx.signup.emailPlaceholder")}
            icon={<Mail className="w-4 h-4" />}
            value={email}
            error={emailError}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailError(email && !emailLooksValid(email) ? t("authx.signup.emailInvalid") : "")}
          />

          {/* Mobile number with country code and an inline "Send OTP" button */}
          <div className="space-y-2">
            <label htmlFor="signup-mobile" className="text-xs font-medium text-ls-muted">
              {t("authx.signup.mobileLabel")}
            </label>
            <div className="flex gap-2">
              <select
                aria-label={t("authx.signup.countryCode")}
                value={dialCode}
                disabled={phoneVerified}
                onChange={(e) => {
                  setDialCode(e.target.value);
                  resetPhone();
                }}
                className="h-12 shrink-0 rounded-lg bg-[#EAEAEA] px-2 text-[15px] text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] disabled:opacity-60"
              >
                {COUNTRIES.map(([country, code]) => (
                  <option key={country} value={code}>
                    {country} {code}
                  </option>
                ))}
              </select>
              <div className="flex-1 min-w-0">
                <Input
                  id="signup-mobile"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="6 12345678"
                  value={localNumber}
                  readOnly={phoneVerified}
                  onChange={(e) => {
                    setLocalNumber(e.target.value);
                    if (otpSent || phoneVerified) resetPhone();
                  }}
                  trailing={
                    phoneVerified ? (
                      <span className="flex items-center gap-1 px-2 text-xs font-bold text-[#1E7B3C]">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">{t("authx.signup.phoneVerified")}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void sendOtp()}
                        disabled={sending || resendIn > 0 || localNumber.trim() === ""}
                        className="h-9 px-3 rounded-md bg-[#FA1EFF] text-white text-xs font-bold whitespace-nowrap hover:bg-[#E000EC] disabled:bg-[#D9D9D9] disabled:text-[#777777] disabled:cursor-not-allowed"
                      >
                        {sending ? "…" : sendLabel}
                      </button>
                    )
                  }
                />
              </div>
            </div>

            {phoneNotice && (
              <p role={phoneNotice.kind === "error" ? "alert" : "status"} className={`text-xs font-medium ${phoneNotice.kind === "error" ? "text-[#ED4C5C]" : "text-[#1E7B3C]"}`}>
                {phoneNotice.text}
              </p>
            )}

            {phoneVerified && (
              <button type="button" onClick={resetPhone} className="text-xs font-bold text-ls-accent-text hover:underline">
                {t("authx.signup.changeNumber")}
              </button>
            )}

            {otpSent && !phoneVerified && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label={t("authx.signup.otpLabel")}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void verifyOtp();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void verifyOtp()}
                  disabled={verifying || otp.length !== 6}
                  className="h-12 px-4 rounded-lg bg-[#121F3E] text-white text-xs font-bold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? "…" : t("authx.signup.verifyOtp")}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Input
              label={t("auth.password")}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              aria-describedby="password-rules"
              onChange={(e) => setPassword(e.target.value)}
            />
            <ul id="password-rules" aria-label={t("authx.signup.pwRulesTitle")} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li key={rule.key} className={`flex items-center gap-2 text-xs transition-colors duration-200 ${met ? "text-[#1E7B3C]" : "text-ls-muted"}`}>
                    <span
                      className={`relative flex w-4 h-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                        met ? "bg-[#1E7B3C] border-[#1E7B3C]" : "border-[#B7B7B7]"
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        className={`w-3 h-3 text-white transition-all duration-200 ease-out motion-reduce:transition-none ${met ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                      />
                    </span>
                    {t(`authx.pw.rule.${rule.key}`)}
                    <span className="sr-only">: {met ? t("authx.signup.ruleMet") : t("authx.signup.ruleMissing")}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Input
            label={t("auth.confirmPassword")}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            value={confirmPassword}
            error={confirmMismatch ? t("authx.signup.mismatch") : ""}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <label className="flex items-start gap-2 text-xs text-[#555555]">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-[#FA1EFF]" />
            <span>
              {t("authx.signup.acceptPrefix")}{" "}
              <Link href="/terms" target="_blank" className="font-bold text-ls-accent-text hover:underline">{t("authx.signup.terms")}</Link>{" "}
              {t("authx.signup.and")}{" "}
              <Link href="/privacy-policy" target="_blank" className="font-bold text-ls-accent-text hover:underline">{t("authx.signup.privacy")}</Link>.
            </span>
          </label>

          <Button type="submit" variant="primary" className={authButtonClass} isLoading={isSubmitting} disabled={!canSubmit || isSubmitting || success}>
            {t("auth.signUp")}
          </Button>
        </form>

        <SocialButtons onSuccess={(user) => router.push(routeForRole(user.role))} onError={setError} />

        <div className="text-center pt-2">
          <p className="text-xs text-ls-muted">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-bold text-ls-accent-text hover:underline">
              {t("auth.logInHere")}
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
