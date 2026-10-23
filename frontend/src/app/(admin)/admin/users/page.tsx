"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { adminApi, type UserRole, type UserStatus } from "@/lib/api/admin";
import { AdminFilters } from "../_components/AdminFilters";
import { AdminPager } from "../_components/AdminPager";
import { ActionError } from "../_components/ActionError";
import { useAdminAction } from "../_components/useAdminAction";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { t, label } = useLocale();
  const f = useFormat();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, error, loading, reload } = useApiResource(`admin-users-${query}-${role}-${status}-${offset}`, () =>
    adminApi.getUsers({ search: query, role: (role || undefined) as UserRole | undefined, status: (status || undefined) as UserStatus | undefined, limit: PAGE_SIZE, offset })
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

        </div>

        <AdminFilters
          search={{ value: search, onChange: setSearch, placeholder: t("adminx.users.searchPlaceholder") }}
          selects={[
            { key: "role", label: t("adminx.filters.role"), value: role, onChange: (v) => { setRole(v); setOffset(0); }, options: (["CONSUMER", "BUSINESS_OWNER", "SUPER_ADMIN"] as const).map((v) => ({ value: v, label: label("role", v) })) },
            { key: "status", label: t("common.status"), value: status, onChange: (v) => { setStatus(v); setOffset(0); }, options: (["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED"] as const).map((v) => ({ value: v, label: label("status", v) })) },
          ]}
          onReset={() => { setSearch(""); setQuery(""); setRole(""); setStatus(""); setOffset(0); }}
        />

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
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatarUrl} name={u.displayName} />
                          <span className="font-bold text-[#111111]">{u.displayName}</span>
                        </div>
                      </td>
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
