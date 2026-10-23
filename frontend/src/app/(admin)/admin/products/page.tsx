"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Trash2, Eye } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, error, loading, reload } = useApiResource(`admin-products-${query}-${active}-${offset}`, () =>
    adminApi.getProducts({ search: query, active: active === "" ? undefined : active === "true", limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const products = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.productModeration")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("adminx.products.subtitle")}</p>
        </div>

        <AdminFilters
          search={{ value: search, onChange: setSearch, placeholder: t("adminx.products.searchPlaceholder") }}
          selects={[{ key: "active", label: t("common.status"), value: active, onChange: (v) => { setActive(v); setOffset(0); }, options: [{ value: "true", label: t("adminx.filters.visible") }, { value: "false", label: t("adminx.filters.hidden") }] }]}
          onReset={() => { setSearch(""); setQuery(""); setActive(""); setOffset(0); }}
        />

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || products.length === 0 ? (
          <EmptyState title={t("adminx.products.emptyTitle")} description={t("adminx.products.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">{t("adminx.products.colProduct")}</th>
                    <th className="p-4">{t("adminx.products.colShop")}</th>
                    <th className="p-4">{t("common.category")}</th>
                    <th className="p-4">{t("common.price")}</th>
                    <th className="p-4">{t("adminx.products.colStock")}</th>
                    <th className="p-4 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {products.map((p) => (
                    <tr key={p.id} className={`hover:bg-[#F9F9F9]/50 transition-colors ${p.active ? "" : "opacity-60"}`}>
                      <td className="p-4 font-bold text-[#111111]">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F9F9F9] shrink-0">
                            {p.imageUrl && <Image src={p.imageUrl} alt={p.name} fill unoptimized className="object-cover" />}
                          </div>
                          <span className="truncate max-w-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[#555555]">{p.businessName}</td>
                      <td className="p-4">{p.category}</td>
                      <td className="p-4 font-bold">{f.currency(p.price)}</td>
                      <td className="p-4">{t("adminx.products.stockUnits", { n: p.stock })}</td>
                      <td className="p-4 text-right">
                        {p.active ? (
                          <button
                            onClick={() => action.run(p.id, () => adminApi.setProductActive(p.id, false))}
                            disabled={action.busyId !== null}
                            className="p-1.5 text-[#ED4C5C] hover:bg-[#F2D9DE] rounded-lg transition-colors disabled:opacity-50"
                            title={t("adminx.products.hide")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => action.run(p.id, () => adminApi.setProductActive(p.id, true))}
                            disabled={action.busyId !== null}
                            className="p-1.5 text-[#3B9B52] hover:bg-[#CBF5D5] rounded-lg transition-colors disabled:opacity-50"
                            title={t("adminx.products.restore")}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
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
