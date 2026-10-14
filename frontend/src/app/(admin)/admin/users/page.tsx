"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi } from "@/lib/api/admin";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, error, loading, reload } = useApiResource(`admin-users-${query}-${offset}`, () =>
    adminApi.getUsers({ search: query, limit: PAGE_SIZE, offset })
  );
  const action = useAdminAction(reload);
  const users = data?.items ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("admin.userManagement")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("adminx.users.subtitle")}</p>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder={t("adminx.users.searchPlaceholder")}
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ActionError message={action.error} />

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingState />
        ) : !data || users.length === 0 ? (
          <EmptyState title={t("adminx.users.emptyTitle")} description={t("adminx.users.emptyDesc")} />
        ) : (
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                  <tr>
                    <th className="p-4">{t("adminx.users.colName")}</th>
                    <th className="p-4">{t("adminx.users.colEmail")}</th>
                    <th className="p-4">{t("adminx.users.colRole")}</th>
                    <th className="p-4">{t("common.status")}</th>
                    <th className="p-4">{t("adminx.users.colRegistered")}</th>
                    <th className="p-4 text-right">{t("adminx.users.colAction")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                      <td className="p-4 font-bold text-[#111111]">{u.displayName}</td>
                      <td className="p-4 text-[#555555]">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={u.role === "SUPER_ADMIN" ? "pink" : u.role === "BUSINESS_OWNER" ? "completed" : "default"}>
                          {label("role", u.role)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.status === "ACTIVE" ? "completed" : u.status === "SUSPENDED" ? "cancelled" : "processing"}>
                          {label("status", u.status)}
                        </Badge>
                      </td>
                      <td className="p-4 text-[#B7B7B7]">{f.date(u.createdAt)}</td>
                      <td className="p-4 text-right">
                        {u.role !== "SUPER_ADMIN" &&
                          (u.status === "SUSPENDED" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={action.busyId === u.id}
                              disabled={action.busyId !== null}
                              onClick={() => action.run(u.id, () => adminApi.setUserStatus(u.id, "ACTIVE"))}
                              className="h-7 text-[11px]"
                            >
                              {t("adminx.users.activate")}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              isLoading={action.busyId === u.id}
                              disabled={action.busyId !== null}
                              onClick={() => action.run(u.id, () => adminApi.setUserStatus(u.id, "SUSPENDED"))}
                              className="h-7 text-[11px] text-[#ED4C5C]"
                            >
                              {t("adminx.users.block")}
                            </Button>
                          ))}
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
