"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type PaymentDiagnosis } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { AdminPager } from "../_components/AdminPager";

const PAGE_SIZE = 20;

export default function AdminPaymentsPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useApiResource(`admin-payments-${offset}`, () =>
    adminApi.getPayments({ limit: PAGE_SIZE, offset })
  );
  const payments = data?.items ?? [];
  const errMsg = useErrorMessage();
  const [diag, setDiag] = useState<PaymentDiagnosis | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [diagErr, setDiagErr] = useState("");
  const runCheck = async () => {
    setDiagBusy(true);
    setDiagErr("");
    try {
      setDiag(await adminApi.checkPaymentSetup());
    } catch (e) {
      setDiag(null);
      setDiagErr(errMsg(e));
    } finally {
      setDiagBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.paymentsLog")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.pay.subtitle")}</p>
          <div className="mt-3 space-y-2">
            <Button variant="outline" size="sm" onClick={runCheck} isLoading={diagBusy}>
              {diagBusy ? t("adminx.pay.checking") : t("adminx.pay.check")}
            </Button>
            {diagErr && <p role="alert" className="text-xs text-red-600">{diagErr}</p>}
            {diag && (
              <div role="status" className={`rounded-xl border p-3 text-xs space-y-1 ${diag.ok ? "border-[#3B9B52] text-[#3B9B52]" : "border-red-300 text-red-700"}`}>
                <p className="font-bold">{diag.ok ? t("adminx.pay.checkOk") : t("adminx.pay.checkFail")}</p>
                <p className="font-mono break-all">
                  key={diag.keyKind} · FRONTEND_URL={diag.frontendUrl || "(empty)"} ({diag.frontendUrlValid ? "ok" : "invalid"})
                  {diag.httpStatus ? ` · HTTP ${diag.httpStatus}` : ""}
                  {diag.code ? ` · ${diag.code}` : ""}
                  {diag.param ? ` · param: ${diag.param}` : ""}
                </p>
                {diag.message && <p className="font-mono break-words">{diag.message}</p>}
                <p className="text-[#555555]">{diag.hint}</p>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || payments.length === 0 ? (
          <EmptyState title={t("adminx.pay.emptyTitle")} description={t("adminx.pay.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">{t("adminx.pay.colCustomerShop")}</th>
                    <th className="p-3">{t("adminx.pay.colType")}</th>
                    <th className="p-3">{t("adminx.pay.colMethod")}</th>
                    <th className="p-3">{t("adminx.pay.colAmount")}</th>
                    <th className="p-3">{t("common.status")}</th>
                    <th className="p-3">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-3 font-mono font-bold">{p.id.slice(0, 8)}</td>
                      <td className="p-3 font-bold text-[#111111]">{p.businessName}</td>
                      <td className="p-3 text-[#555555]">{label("purpose", p.type)}</td>
                      <td className="p-3">{label("method", p.method)}</td>
                      <td className="p-3 font-extrabold">{f.currency(p.amount)}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            p.status === "PAID"
                              ? "completed"
                              : p.status === "PENDING" || p.status === "AUTHORIZED"
                                ? "processing"
                                : "cancelled"
                          }
                        >
                          {label("status", p.status)}
                        </Badge>
                      </td>
                      <td className="p-3 text-[#B7B7B7]">{f.date(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPager meta={data.meta} onOffsetChange={setOffset} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
