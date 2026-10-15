"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Store, ShoppingBag } from "lucide-react";
import { AuthShell, authButtonClass } from "@/components/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { routeForRole } from "@/lib/auth/redirect";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { UserRole } from "@/types/user";

// Accepts either a valid email OR a phone number (loose E.164 / NL-style),
// unlike the previous native type="email" input which rejected phone
// numbers outright. See PROMPT.md item 2.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\-.\s]{7,15}$/;

// Phone verification needs an SMS provider (no free production option yet), so
// mobile sign-up is off unless the deployment explicitly enables it.
const SMS_ENABLED = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";

function isEmail(value: string) {
  return EMAIL_REGEX.test(value.trim());
}
function isPhone(value: string) {
  return PHONE_REGEX.test(value.trim());
}

type Step = "form" | "role" | "verify";

export default function SignupPage() {
  const router = useRouter();
  const { register, verifyCode, resendCode, pendingVerification } = useAuth();
  const { t } = useLocale();
  const errMsg = useErrorMessage();

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [code, setCode] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !identifier || !password) {
      setError(t("authx.signup.fillRequired"));
      return;
    }
    if (!isEmail(identifier) && !isPhone(identifier)) {
      setError(t("authx.signup.invalidContact"));
      return;
    }
    if (!isEmail(identifier) && !SMS_ENABLED) {
      setError(t("authx.signup.mobileUnavailable"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("authx.signup.mismatch"));
      return;
    }
    setStep("role");
  };

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    setIsSubmitting(true);
    setError("");
    try {
      await register({
        email: isEmail(identifier) ? identifier : undefined,
        phone: isPhone(identifier) ? identifier : undefined,
        password,
        role,
        displayName: name,
      });
      setStep("verify");
    } catch (err) {
      setError(errMsg(err, { conflict: "authx.signup.exists", unavailable: "authx.signup.emailUnavailable", unknown: "authx.signup.failed" }));
      setStep("form");
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
      if (selectedRole === "BUSINESS_OWNER") {
        router.push("/onboarding/business");
      } else {
        router.push("/products");
      }
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
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t("auth.fullName")}
                placeholder={t("authx.signup.namePlaceholder")}
                icon={<User className="w-4 h-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={t("auth.emailOrMobile")}
                type="text"
                inputMode="email"
                placeholder={t("authx.signup.contactPlaceholder")}
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

              <Input
                label={t("auth.confirmPassword")}
                type="password"
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button type="submit" variant="primary" className={authButtonClass}>
                {t("auth.signUp")}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-[#B7B7B7] text-center">
                {t("authx.signup.codeSent")}{" "}
                <strong className="text-[#111111]">{pendingVerification?.identifier}</strong> {t("authx.signup.via")}{" "}
                {pendingVerification?.channel === "EMAIL" ? t("authx.signup.channelEmail") : t("authx.signup.channelSms")}.
              </p>
              <Input
                label={t("authx.signup.codeLabel")}
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button type="submit" variant="primary" className={authButtonClass} isLoading={isSubmitting}>
                {t("authx.signup.confirm")}
              </Button>
              <button
                type="button"
                onClick={() => resendCode()}
                className="w-full text-xs font-bold text-[#FA1EFF] hover:underline text-center"
              >
                {t("authx.signup.resend")}
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
            <p className="text-xs text-[#B7B7B7]">
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="font-bold text-[#FA1EFF] hover:underline">
                {t("auth.logInHere")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ACCOUNT TYPE MODAL */}
      {step === "role" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl text-center space-y-5">
            <h2 className="text-lg font-bold font-rubik text-[#111111]">{t("auth.chooseAccountType")}</h2>
            <p className="text-xs text-[#B7B7B7]">{t("auth.howUse")}</p>

            <div className="space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleRoleSelect("CONSUMER")}
                className="w-full p-4 rounded-2xl border-2 border-[#FAE2F0] bg-[#F9F9F9] hover:bg-[#FAE2F0] hover:border-[#FA1EFF] text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FA1EFF] text-white flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#111111] group-hover:text-[#FA1EFF]">
                      {t("auth.iAmConsumer")}
                    </span>
                    <span className="block text-[11px] text-[#B7B7B7]">
                      {t("auth.consumerDesc")}
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleRoleSelect("BUSINESS_OWNER")}
                className="w-full p-4 rounded-2xl border-2 border-[#121F3E]/20 bg-[#F9F9F9] hover:bg-[#121F3E]/10 hover:border-[#121F3E] text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#121F3E] text-white flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#111111]">{t("auth.iAmBusinessOwner")}</span>
                    <span className="block text-[11px] text-[#B7B7B7]">
                      {t("auth.businessOwnerDesc")}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
