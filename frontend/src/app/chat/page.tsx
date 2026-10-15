"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/hooks/usePolling";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

/** Conversation list (consumers see their shops, owners see their customers). */
export default function ChatListPage() {
  const { t } = useLocale();
  const fmt = useFormat();
  const { role } = useAuth();
  const list = usePolling("chat:list", () => api.getConversations(), 10000);
  const isOwner = role === "BUSINESS_OWNER";

  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto space-y-4">
        <h1 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.chat.title")}</h1>

        {list.loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        )}

        {!list.loading && list.error && !list.data && (
          <div role="alert" className="bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl p-4 text-center space-y-2">
            <p>{t("manage.chat.loadFailed")}</p>
            <button type="button" onClick={() => void list.reload()} className="underline">
              {t("manage.chat.retry")}
            </button>
          </div>
        )}

        {list.data && list.data.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-2">
            <MessageCircle className="w-8 h-8 mx-auto text-[#B7B7B7]" />
            <p className="text-sm font-bold text-[#121F3E]">{t("manage.chat.empty")}</p>
            <p className="text-xs text-[#B7B7B7]">{isOwner ? t("manage.chat.emptyOwner") : t("manage.chat.emptyConsumer")}</p>
          </div>
        )}

        <ul className="space-y-3">
          {(list.data ?? []).map((c) => {
            const name = isOwner ? c.consumerName : c.businessName;
            return (
              <li key={c.id}>
                <Link href={`/chat/${c.id}`} className="flex items-center gap-3 bg-white rounded-xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
                  <span className="w-11 h-11 rounded-full bg-[#FAE2F0] text-[#FA1EFF] font-bold flex items-center justify-center shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#121F3E] truncate">{name}</span>
                      <span className="text-[10px] text-[#B7B7B7] shrink-0">{fmt.date(c.lastMessageAt, { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="block text-xs text-[#B7B7B7] truncate">
                      {c.lastMessage ? `${c.lastMessage.mine ? t("manage.chat.youPrefix") : ""}${c.lastMessage.body}` : "…"}
                    </span>
                  </span>
                  {c.unreadCount > 0 && (
                    <span
                      className="min-w-5 h-5 px-1.5 rounded-full bg-[#FA1EFF] text-white text-[10px] font-bold flex items-center justify-center"
                      aria-label={t("manage.chat.unread", { count: c.unreadCount })}
                    >
                      {c.unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </RoleLayout>
  );
}
