"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { routeForRole, safeRedirect } from "@/lib/auth/redirect";
import type { User } from "@/types/user";

const ADMIN_PORTAL = process.env.NEXT_PUBLIC_PORTAL === "admin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyMfa, verifyLoginOtp, resendLoginOtp } = useAuth();
  const { t } = useLocale();
  const errMsg = useErrorMessage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Second step after a correct password: the admin's authenticator code, or an SMS code (customers and shop owners).
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [smsHint, setSmsHint] = useState(""); // set only for the SMS step
  const [notice, setNotice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError(t("authx.fillAll"));
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(identifier, password);
      if ("mfaToken" in result) {
        setMfaToken(result.mfaToken);
        return;
      }
      if ("otpToken" in result) {
        setMfaToken(result.otpToken);
        setSmsHint(result.phoneHint);
        return;
      }
      const user = result;
      // Honour ?redirectTo= only when it is a safe same-origin path.
      router.push(safeRedirect(searchParams.get("redirectTo"), routeForRole(user.role)));
    } catch (err) {
      setError(errMsg(err, { unauthorized: "authx.invalidCredentials" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = smsHint ? await verifyLoginOtp(mfaToken, mfaCode.trim()) : await verifyMfa(mfaToken, mfaCode.trim());
      router.push(safeRedirect(searchParams.get("redirectTo"), routeForRole(user.role)));
    } catch (err) {
      setError(errMsg(err, { unauthorized: "manage.mfa.invalid", validation: "manage.mfa.invalid" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    try {
      await resendLoginOtp(mfaToken);
      setNotice(t("authx.sms.resent"));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleSocialSuccess = (user: User) => {
    router.push(safeRedirect(searchParams.get("redirectTo"), routeForRole(user.role)));
  };

  return (
    <AuthShell>
      <div>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-[44px] leading-none font-extrabold font-rubik text-black">{t("auth.hello")}</h1>
            <p className="text-xs text-[#111111]">{t("auth.signInSubtitle")}</p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {mfaToken ? (
            <form onSubmit={handleMfa} className="space-y-4">
              <p className="text-xs text-[#111111]">
                <span className="block text-sm font-bold">{smsHint ? t("authx.sms.title") : t("manage.mfa.title")}</span>
                {smsHint ? t("authx.sms.prompt", { phone: smsHint }) : t("manage.mfa.prompt")}
              </p>
              {notice && <p role="status" className="text-xs font-bold text-[#3B9B52]">{notice}</p>}
              <Input
                label={smsHint ? t("authx.sms.code") : t("manage.mfa.code")}
                type="text"
                inputMode={smsHint ? "numeric" : "text"}
                autoComplete="one-time-code"
                autoFocus
                maxLength={11}
                placeholder="123456"
                icon={<ShieldCheck className="w-4 h-4" />}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
              <Button type="submit" variant="primary" className={authButtonClass} isLoading={isLoading} disabled={mfaCode.trim().length < 6}>
                {smsHint ? t("authx.sms.verify") : t("manage.mfa.verify")}
              </Button>
              {smsHint && (
                <button type="button" onClick={handleResend} className="w-full text-xs font-bold text-ls-accent-text hover:underline">
                  {t("authx.sms.resend")}
                </button>
              )}
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("auth.emailMobileUsername")}
              type="text"
              placeholder={t("authx.loginPlaceholder")}
              icon={<Mail className="w-4 h-4" />}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <Input
              label={t("auth.password")}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-bold text-ls-accent-text hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" variant="primary" className={authButtonClass} isLoading={isLoading}>
              {t("auth.login")}
            </Button>
          </form>
          )}

          {/* The admin deployment has no guest shopping, sign-up or social login (admins use the authenticator app). */}
          {!ADMIN_PORTAL && <SocialButtons onSuccess={handleSocialSuccess} onError={setError} />}

          {!ADMIN_PORTAL && (
          <div className="text-center pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                document.cookie = "ls_guest=1; path=/; SameSite=Lax";
                window.location.assign("/");
              }}
              className="text-xs font-bold text-[#790166] hover:underline"
            >
              {t("manage.login.guest")}
            </button>
            <p className="text-xs text-ls-muted">
              {t("auth.noAccount")}{" "}
              <Link href="/signup" className="font-bold text-ls-accent-text hover:underline">
                {t("auth.signUpHere")}
              </Link>
            </p>
          </div>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams() needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
