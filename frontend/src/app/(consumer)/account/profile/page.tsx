"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Check } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function ProfileEditPage() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { data: profile, error, loading, reload } = useApiResource("consumer-profile", () => api.getConsumerProfile());
  // null = untouched, so the field shows the saved profile value.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const name = nameInput ?? profile?.displayName ?? "";
  const phone = phoneInput ?? profile?.phone ?? "";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateConsumerProfile({ displayName: name.trim(), phone: phone.trim() });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("account.info")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("account.profileSubtitle")}</p>
          </div>

          {loading ? (
            <LoadingState label={t("account.profileLoading")} />
          ) : error || !profile ? (
            <ErrorState title={t("account.profileUnavailable")} message={error} onRetry={reload} />
          ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label={t("account.fullName")}
              icon={<User className="w-4 h-4" />}
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              required
            />

            <Input
              label={t("account.emailAddress")}
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={profile.email ?? ""}
              readOnly
              disabled
            />

            <Input
              label={t("checkout.phone")}
              icon={<Phone className="w-4 h-4" />}
              value={phone}
              onChange={(e) => setPhoneInput(e.target.value)}
            />

            {saveError && (
              <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
                {saveError}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={saving} className="mt-4 gap-2">
              {saved ? (
                <>
                  <Check className="w-5 h-5" /> {t("account.saveSuccess")}
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </form>
          )}
        </div>
      </div>
    </ConsumerLayout>
  );
}
