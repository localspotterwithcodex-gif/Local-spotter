"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Store, ShoppingBag } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api/client";
import { UserRole } from "@/types/user";

// Accepts either a valid email OR a phone number (loose E.164 / NL-style),
// unlike the previous native type="email" input which rejected phone
// numbers outright. See PROMPT.md item 2.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\-.\s]{7,15}$/;

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
      setError("Vul a.u.b. alle verplichte velden in.");
      return;
    }
    if (!isEmail(identifier) && !isPhone(identifier)) {
      setError("Vul een geldig e-mailadres of telefoonnummer in.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
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
      setError(err instanceof ApiError ? err.message : "Registreren is mislukt. Probeer het opnieuw.");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length !== 6) {
      setError("Voer de 6-cijferige code in.");
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
      setError(err instanceof ApiError ? err.message : "Ongeldige code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConsumerLayout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto my-8 bg-white p-6 sm:p-7 rounded-3xl border border-[#EAEAEA] shadow-md space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-3">
              LS
            </div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">{t("auth.hi")}</h1>
            <p className="text-xs text-[#B7B7B7]">
              {step === "verify" ? "Bevestig je account" : t("auth.createAccount")}
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
                placeholder="Sanne de Jong"
                icon={<User className="w-4 h-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={t("auth.emailOrMobile")}
                type="text"
                inputMode="email"
                placeholder="naam@voorbeeld.nl of 06-12345678"
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

              <Button type="submit" variant="primary" size="lg" fullWidth>
                {t("auth.signUp")}
              </Button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-[#B7B7B7] text-center">
                We hebben een 6-cijferige code gestuurd naar{" "}
                <strong className="text-[#111111]">{pendingVerification?.identifier}</strong> via{" "}
                {pendingVerification?.channel === "EMAIL" ? "e-mail" : "sms"}.
              </p>
              <Input
                label="Verificatiecode"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
                BEVESTIGEN
              </Button>
              <button
                type="button"
                onClick={() => resendCode()}
                className="w-full text-xs font-bold text-[#FA1EFF] hover:underline text-center"
              >
                Code opnieuw versturen
              </button>
            </form>
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
    </ConsumerLayout>
  );
}
