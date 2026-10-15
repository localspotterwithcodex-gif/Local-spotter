"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/hooks/usePolling";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

const MAX_LENGTH = 2000;

/** One conversation: bubbles, 5 s refresh, composer. */
export default function ChatThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const fmt = useFormat();
  const { role } = useAuth();
  const isOwner = role === "BUSINESS_OWNER";

  const thread = usePolling(id ?? null, () => api.getChatThread(id as string), 5000);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const unreadFromOther = (thread.data?.messages ?? []).filter((m) => !m.mine && !m.readAt).length;

  // Keep the newest message in view, but only when something new arrived.
  useEffect(() => {
    const count = thread.data?.messages.length ?? 0;
    if (count !== lastCount.current) {
      lastCount.current = count;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [thread.data]);

  // Tell the server we have seen the other side's messages.
  useEffect(() => {
    if (id && unreadFromOther > 0) void api.markChatRead(id).catch(() => undefined);
  }, [id, unreadFromOther]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !id) return;
    setSending(true);
    setSendError(false);
    try {
      const sent = await api.sendChatMessage(id, body);
      setDraft("");
      thread.setData((prev) => (prev ? { ...prev, messages: [...prev.messages, sent] } : prev));
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const title = thread.data ? (isOwner ? thread.data.conversation.consumerName : thread.data.conversation.businessName) : "";

  return (
    <RoleLayout>
      <div className="max-w-[428px] mx-auto flex flex-col" style={{ minHeight: "calc(100vh - 230px)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/chat" aria-label={t("manage.chat.back")} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#121F3E]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold font-rubik text-[#111111] truncate">{title || t("manage.chat.title")}</h1>
        </div>

        <div className="flex-1 space-y-2 pb-3" aria-live="polite">
          {thread.loading && <div className="h-10 w-2/3 rounded-2xl bg-white shadow-sm animate-pulse" />}
          {!thread.loading && thread.error && !thread.data && (
            <div role="alert" className="bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl p-4 text-center space-y-2">
              <p>{t("manage.chat.loadFailed")}</p>
              <button type="button" onClick={() => void thread.reload()} className="underline">
                {t("manage.chat.retry")}
              </button>
            </div>
          )}
          {thread.data && thread.data.messages.length === 0 && <p className="text-xs text-[#B7B7B7] text-center py-8">{t("manage.chat.noMessages")}</p>}
          {(thread.data?.messages ?? []).map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? "bg-[#FA1EFF] text-white rounded-br-md" : "bg-white text-[#121F3E] shadow-sm rounded-bl-md"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.mine ? "text-white/70" : "text-[#B7B7B7]"}`}>{fmt.time(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {sendError && (
          <p role="alert" className="text-xs font-bold text-[#E54666] mb-2">
            {t("manage.chat.sendFailed")}
          </p>
        )}
        <form onSubmit={send} className="sticky bottom-24 md:bottom-4 flex items-end gap-2 bg-[#F9F9F9] pt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder={t("manage.chat.placeholder")}
            aria-label={t("manage.chat.placeholder")}
            className="flex-1 max-h-28 resize-none bg-[#EAEAEA] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label={t("manage.chat.send")}
            className="w-11 h-11 shrink-0 rounded-full bg-[#FA1EFF] text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </RoleLayout>
  );
}
