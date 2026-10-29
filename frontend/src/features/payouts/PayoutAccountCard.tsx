"use client";

import React, { useState } from "react";
import { Landmark } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/** Bank account for the weekly payout. The IBAN is sent once and never shown again (only the last 4 digits). */
export function PayoutAccountCard({ businessId }: { businessId: string }) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const account = useApiResource(`payout-account:${businessId}`, () => api.getPayoutAccount(businessId));
  const [editing, setEditing] = useState(false);
  const [holder, setHolder] = useState("");
  const [iban, setIban] = useState("");
  const [intl, setIntl] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bic, setBic] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const a = account.data;
  const showForm = editing || (a !== null && a !== undefined && !a.configured);

  const startEdit = () => {
    setHolder(a?.accountHolderName ?? "");
    setIban("");
    setIntl(false);
    setBankName("");
    setBic("");
    setCountry("");
    setSaved(false);
    setEditing(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.savePayoutAccount(businessId, {
        accountHolderName: holder.trim(),
        iban: iban.replace(/\s+/g, ""),
        ...(intl ? { bankName: bankName.trim(), bic: bic.replace(/\s+/g, ""), country: country.trim() } : {}),
      });
      setIban(""); // never keep the number around in the page
      setEditing(false);
      setSaved(true);
      account.reload();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-[#790166]" />
        <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("payoutsx.account.title")}</h2>
      </div>
      <p className="text-[11px] text-[#B7B7B7]">{t("payoutsx.account.help")}</p>

      {account.loading ? (
        <p className="text-xs text-[#B7B7B7]">{t("manage.payouts.loading")}</p>
      ) : account.error ? (
        <p role="alert" className="text-xs text-red-600">{account.error}</p>
      ) : (
        <>
          {a?.configured && !showForm && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-[#111111]">{a.accountHolderName}</p>
                <p className="text-[#555555]">{t("payoutsx.account.current", { iban: a.ibanMasked ?? "" })}</p>
              </div>
              <Button variant="outline" size="sm" onClick={startEdit}>
                {t("payoutsx.account.change")}
              </Button>
            </div>
          )}
          {saved && <p role="status" className="text-xs text-[#3B9B52]">{t("payoutsx.account.saved")}</p>}
          {showForm && (
            <form onSubmit={submit} className="space-y-3">
              {!a?.configured && <p className="text-xs text-[#E54666] font-bold">{t("payoutsx.account.missing")}</p>}
              <Input label={t("payoutsx.account.holder")} value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={100} required />
              <Input
                label={intl ? t("payoutsx.account.number") : t("payoutsx.account.iban")}
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={intl ? "1234567890" : "NL91 ABNA 0417 1643 00"}
                maxLength={50}
                required
              />
              <label className="flex items-center gap-2 text-xs text-[#555555]">
                <input type="checkbox" checked={intl} onChange={(e) => setIntl(e.target.checked)} />
                {t("payoutsx.account.intl")}
              </label>
              {intl && (
                <div className="space-y-3">
                  <Input label={t("payoutsx.account.bankName")} value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} required />
                  <Input label={t("payoutsx.account.bic")} value={bic} onChange={(e) => setBic(e.target.value)} maxLength={11} autoComplete="off" required />
                  <Input label={t("payoutsx.account.country")} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} required />
                  <p className="text-[11px] text-[#B7B7B7]">{t("payoutsx.account.intlNote")}</p>
                </div>
              )}
              {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm" isLoading={busy}>
                  {t("payoutsx.account.save")}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
