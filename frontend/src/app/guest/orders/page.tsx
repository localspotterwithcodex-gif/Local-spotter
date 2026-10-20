"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

function RequestLinkForm({ reason }: { reason?: string }) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.requestGuestOrderLink(email.trim(), orderNumber.trim());
      setSent(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("guest.orders.title")}</h1>
        <p className="text-xs text-[#B7B7B7]">{t("guest.orders.subtitle")}</p>
      </div>
      {reason && <p role="alert" className="text-xs text-[#ED4C5C] text-center">{reason}</p>}
      {sent ? (
        <p role="status" className="bg-[#CBF5D5]/60 border border-[#3B9B52]/30 text-[#2F7A42] text-xs font-bold rounded-2xl p-4">
          {t("guest.orders.sent")}
        </p>
      ) : (
        <form onSubmit={submit} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
          <Input label={t("guest.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label={t("guest.orders.orderNumber")} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required maxLength={60} />
          {error && <p role="alert" className="text-xs text-[#ED4C5C]">{error}</p>}
          <Button type="submit" variant="primary" fullWidth isLoading={busy}>{t("guest.orders.send")}</Button>
        </form>
      )}
    </div>
  );
}

function GuestOrdersContent() {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { openGuestLink } = useAuth();
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    openGuestLink(token).then(
      () => router.replace("/account/orders"),
      (err: unknown) => setFailure(errMsg(err))
    );
    // errMsg/openGuestLink/router are stable enough; the token is the only input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (token && !failure) return <LoadingState label={t("guest.orders.opening")} />;
  return <RequestLinkForm reason={failure ?? undefined} />;
}

export default function GuestOrdersPage() {
  return (
    <ConsumerLayout>
      <Suspense fallback={<LoadingState label="…" />}>
        <GuestOrdersContent />
      </Suspense>
    </ConsumerLayout>
  );
}
