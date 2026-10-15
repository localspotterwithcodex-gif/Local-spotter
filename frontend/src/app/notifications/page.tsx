"use client";

import React from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { api } from "@/lib/api";
import { safeRedirect } from "@/lib/auth/redirect";
import { usePolling } from "@/lib/hooks/usePolling";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

/** Inbox for the notifications the backend already creates (orders, bookings, ...). */
export default function NotificationsPage() {
  const { t } = useLocale();
  const fmt = useFormat();
  const inbox = usePolling("notifications", () => api.getNotifications(true), 30000);
  const items = inbox.data?.notifications ?? [];
  const unread = inbox.data?.unreadCount ?? 0;

  const markOne = async (id: string) => {
    inbox.setData((prev) =>
      prev ? { notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)), unreadCount: Math.max(0, prev.unreadCount - 1) } : prev
    );
    try {
      await api.markNotificationRead(id);
    } catch {
      void inbox.reload(); // roll back to the server state
    }
  };

  const markAll = async () => {
    inbox.setData((prev) => (prev ? { notifications: prev.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 } : prev));
    try {
      await api.markAllNotificationsRead();
    } catch {
      void inbox.reload();
    }
  };

  return (
    <RoleLayout>
      <div className="max-w-[428px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.notifications.title")}</h1>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="flex items-center gap-1.5 text-xs font-bold text-[#FA1EFF] hover:underline">
              <CheckCheck className="w-4 h-4" /> {t("manage.notifications.markAll")}
            </button>
          )}
        </div>

        {inbox.loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        )}

        {!inbox.loading && inbox.error && !inbox.data && (
          <div role="alert" className="bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl p-4 text-center space-y-2">
            <p>{t("manage.notifications.loadFailed")}</p>
            <button type="button" onClick={() => void inbox.reload()} className="underline">
              {t("manage.chat.retry")}
            </button>
          </div>
        )}

        {inbox.data && items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-2">
            <Bell className="w-8 h-8 mx-auto text-[#B7B7B7]" />
            <p className="text-sm font-bold text-[#121F3E]">{t("manage.notifications.empty")}</p>
            <p className="text-xs text-[#B7B7B7]">{t("manage.notifications.emptyHint")}</p>
          </div>
        )}

        <ul className="space-y-3">
          {items.map((n) => {
            const body = (
              <>
                <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-[#FA1EFF]"}`} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-[#121F3E]">{n.title}</span>
                  <span className="block text-xs text-[#555555] mt-0.5 break-words">{n.message}</span>
                  <span className="block text-[10px] text-[#B7B7B7] mt-1">{fmt.dateTime(n.createdAt)}</span>
                </span>
              </>
            );
            const cls = `flex items-start gap-3 rounded-xl shadow-sm px-4 py-3 ${n.read ? "bg-white" : "bg-[#FAE2F0]/50"}`;
            return (
              <li key={n.id}>
                {n.linkUrl ? (
                  <Link href={safeRedirect(n.linkUrl, "/notifications")} onClick={() => !n.read && void markOne(n.id)} className={`${cls} hover:shadow-md transition-shadow`}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => !n.read && void markOne(n.id)} className={`${cls} w-full text-left`}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </RoleLayout>
  );
}
