"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api/client";
import { UserRole } from "@/types/user";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLocale();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectForRole = (role: UserRole) => {
    if (role === "SUPER_ADMIN") router.push("/admin");
    else if (role === "BUSINESS_OWNER") router.push("/owner");
    else router.push("/products");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      setError("Vul a.u.b. alle velden in.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(identifier, password);
      redirectForRole(user.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Inloggen is mislukt.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConsumerLayout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm mx-auto my-8 bg-white p-6 sm:p-7 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="text-center space-y-1">
            <img
              src="/logo.png"
              alt="LocalSpotter Logo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">{t("auth.hello")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("auth.signInSubtitle")}</p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("auth.emailMobileUsername")}
              type="text"
              placeholder="naam@voorbeeld.nl, 06-12345678 of Admin"
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
              <Link href="/forgot-password" className="text-xs font-bold text-[#FA1EFF] hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
              {t("auth.login")}
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-[#B7B7B7]">
              {t("auth.noAccount")}{" "}
              <Link href="/signup" className="font-bold text-[#FA1EFF] hover:underline">
                {t("auth.signUpHere")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
