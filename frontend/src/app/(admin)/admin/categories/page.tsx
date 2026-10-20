"use client";

import React, { useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type CategoryKind } from "@/lib/api/admin";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

export default function AdminCategoriesPage() {
  const { t } = useLocale();
  const [kind, setKind] = useState<CategoryKind>("business");
  const [name, setName] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { data, error, loading, reload } = useApiResource(`admin-categories-${kind}`, () => adminApi.getCategories(kind));
  const action = useAdminAction(reload);
  const items = data ?? [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    await action.run("new", async () => {
      await adminApi.createCategory(kind, { name: value });
      setName("");
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA] flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.categories")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.cat.subtitle")}</p>
          </div>
          <select
            aria-label={t("adminx.cat.kind")}
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
            className="h-10 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold px-3"
          >
            <option value="business">{t("adminx.cat.business")}</option>
            <option value="product">{t("adminx.cat.product")}</option>
          </select>
        </div>

        <form onSubmit={create} className="flex gap-2">
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("adminx.cat.newPlaceholder")}
            aria-label={t("adminx.cat.newPlaceholder")}
            className="flex-1 h-10 bg-[#EAEAEA] rounded-xl px-3 text-sm"
          />
          <button type="submit" disabled={action.busyId !== null || !name.trim()} className="h-10 px-4 rounded-xl bg-[#3B9B52] text-white text-xs font-bold disabled:opacity-50">
            {t("adminx.cat.add")}
          </button>
        </form>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState title={t("adminx.cat.emptyTitle")} description={t("adminx.cat.emptyDesc")} />
        ) : (
          <ul className="space-y-2">
            {items.map((c) => {
              const draft = edits[c.id] ?? c.name;
              const dirty = draft.trim() !== c.name && draft.trim().length > 0;
              return (
                <li key={c.id} className="bg-white rounded-2xl border border-[#EAEAEA] p-3 flex flex-wrap items-center gap-2 text-xs">
                  <input
                    value={draft}
                    maxLength={80}
                    aria-label={c.name}
                    onChange={(e) => setEdits((m) => ({ ...m, [c.id]: e.target.value }))}
                    className="flex-1 min-w-[160px] h-9 bg-[#EAEAEA] rounded-xl px-3"
                  />
                  <span className="text-[#B7B7B7]">{t("adminx.cat.usage", { count: c.usage })}</span>
                  {dirty && (
                    <button
                      disabled={action.busyId !== null}
                      onClick={() => action.run(c.id, () => adminApi.updateCategory(kind, c.id, { name: draft.trim() }))}
                      className="font-bold text-[#3B9B52] disabled:opacity-50"
                    >
                      {t("adminx.cat.save")}
                    </button>
                  )}
                  <button
                    disabled={action.busyId !== null}
                    onClick={() => action.run(c.id, () => adminApi.updateCategory(kind, c.id, { active: !c.active }))}
                    className="font-bold text-[#555555] disabled:opacity-50"
                  >
                    {c.active ? t("adminx.cat.deactivate") : t("adminx.cat.activate")}
                  </button>
                  <button
                    disabled={action.busyId !== null || c.usage > 0}
                    title={c.usage > 0 ? t("adminx.cat.inUse") : undefined}
                    onClick={() => action.run(c.id, () => adminApi.deleteCategory(kind, c.id))}
                    className="font-bold text-[#C0392B] disabled:opacity-40"
                  >
                    {t("adminx.cat.delete")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
