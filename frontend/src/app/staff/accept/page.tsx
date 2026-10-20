"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleLayout } from "@/layouts/RoleLayout";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";

function AcceptInvite() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await api.acceptEmployeeInvite(token);
      router.push("/staff");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoleLayout>
      <div className="max-w-[420px] mx-auto bg-white rounded-3xl border border-[#EAEAEA] p-6 space-y-4 text-center">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("staff.acceptTitle")}</h1>
        <p className="text-xs text-[#555555]">{t("staff.acceptDesc")}</p>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <Button variant="primary" size="lg" fullWidth onClick={accept} isLoading={busy} disabled={!token}>
          {t("staff.acceptButton")}
        </Button>
      </div>
    </RoleLayout>
  );
}

export default function StaffAcceptPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvite />
    </Suspense>
  );
}
