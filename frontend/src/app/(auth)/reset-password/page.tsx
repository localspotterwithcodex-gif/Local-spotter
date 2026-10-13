"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "demo-reset-token";

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
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.exec(password) !== null;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasMinLength) {
      setError("Wachtwoord moet minimaal 8 tekens lang zijn.");
      return;
    }
    if (!passwordsMatch) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center mx-auto mb-2">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold font-rubik text-[#111111]">
          Nieuw Wachtwoord Instellen
        </h1>
        <p className="text-xs text-[#B7B7B7]">
          Voer hieronder je nieuwe wachtwoord in om je LocalSpotter account weer te beveiligen.
        </p>
      </div>

      {isSuccess ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-[#CBF5D5] text-[#3B9B52] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#111111] font-rubik">
              Wachtwoord Gewijzigd!
            </h2>
            <p className="text-xs text-[#B7B7B7]">
              Je wachtwoord is succesvol bijgewerkt. Je kunt nu inloggen met je nieuwe wachtwoord.
            </p>
          </div>
          <Button
            variant="primary"
            fullWidth
            onClick={() => router.push("/login")}
            className="gap-2 mt-4"
          >
            NAAR INLOGGEN <ArrowRight className="w-4 h-4" />
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
              label="Nieuw Wachtwoord"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-[#B7B7B7] hover:text-[#111111] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1 relative">
            <Input
              label="Bevestig Nieuw Wachtwoord"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-[38px] text-[#B7B7B7] hover:text-[#111111] transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] space-y-2 text-xs">
            <span className="font-bold text-[#111111] block mb-1">Vereisten voor wachtwoord:</span>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={hasMinLength ? "text-[#111111]" : "text-[#B7B7B7]"}>Minimaal 8 tekens</span>
            </div>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasNumber ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={hasNumber ? "text-[#111111]" : "text-[#B7B7B7]"}>Bevat ten minste 1 getal</span>
            </div>
            <div className="flex items-center gap-2 text-[#111111]">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? "bg-[#CBF5D5] text-[#3B9B52]" : "bg-[#EAEAEA] text-[#B7B7B7]"}`}>
                ✓
              </div>
              <span className={passwordsMatch ? "text-[#111111]" : "text-[#B7B7B7]"}>Wachtwoorden komen overeen</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            className="mt-4"
          >
            WACHTWOORD BIJWERKEN
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-[#FA1EFF] hover:underline font-bold"
            >
              Terug naar Inloggen
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <ConsumerLayout>
      <Suspense fallback={
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#FA1EFF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111111]">Laden...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </ConsumerLayout>
  );
}
