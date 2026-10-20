"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type AdminPlanCommission } from "@/lib/api/admin";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const bpsToPercent = (bps: number | null): string => (bps === null ? "" : String(bps / 100));

/** "" = platform default (null); otherwise 0-50 with at most 2 decimals. */
function percentToBps(text: string): number | null | "invalid" {
  const v = text.trim().replace(",", ".");
  if (v === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return "invalid";
  const bps = Math.round(Number(v) * 100);
  return bps > 5000 ? "invalid" : bps;
}

function PlanRow({ plan, defaultBps, onSaved }: { plan: AdminPlanCommission; defaultBps: number; onSaved: () => void }) {
  const { t } = useLocale();
  const f = useFormat();
  const action = useAdminAction(onSaved);
  const [text, setText] = useState(bpsToPercent(plan.commissionBps));
  const [invalid, setInvalid] = useState(false);

  const save = () => {
    const bps = percentToBps(text);
    if (bps === "invalid") return setInvalid(true);
    setInvalid(false);
    void action.run(plan.id, () => adminApi.setPlanCommission(plan.id, bps));
  };

  return (
    <li className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#111111]">{plan.name}</p>
          <p className="text-[11px] text-[#B7B7B7]">{f.currency(plan.monthlyPrice)} / {t("adminx.commission.month")}</p>
        </div>
        <p className="text-xs text-[#555555]">
          {plan.commissionBps === null ? t("adminx.commission.usingDefault", { percent: defaultBps / 100 }) : t("adminx.commission.own", { percent: plan.commissionBps / 100 })}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-bold text-[#555555]">
          {t("adminx.commission.percent")}
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("adminx.commission.defaultPlaceholder")}
            aria-invalid={invalid}
            className="mt-1 block w-40 h-9 rounded-lg bg-[#EAEAEA] px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
        </label>
        <Button variant="primary" size="sm" isLoading={action.busyId === plan.id} disabled={action.busyId !== null} onClick={save}>
          {t("common.save")}
        </Button>
      </div>
      {invalid && <p role="alert" className="text-xs text-red-600">{t("adminx.commission.invalid")}</p>}
      <ActionError message={action.error} />
    </li>
  );
}

export default function AdminCommissionPage() {
  const { t } = useLocale();
  const { data, error, loading, reload } = useApiResource("admin-plan-commissions", () => adminApi.getPlanCommissions());

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.commission")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.commission.subtitle")}</p>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <LoadingState />
        ) : (
          <>
            <p className="text-[11px] text-[#B7B7B7]">{t("adminx.commission.note", { percent: data.defaultBps / 100 })}</p>
            <ul className="space-y-3">
              {data.plans.map((p) => (
                <PlanRow key={p.id} plan={p} defaultBps={data.defaultBps} onSaved={reload} />
              ))}
            </ul>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
