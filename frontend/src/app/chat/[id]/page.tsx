"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, ImagePlus, Flag, Ban } from "lucide-react";
import { RoleLayout } from "@/layouts/RoleLayout";
import { api, type ChatReportReason } from "@/lib/api";
import type { TranslationKey } from "@/i18n/dictionaries";
import { usePolling } from "@/lib/hooks/usePolling";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

const MAX_LENGTH = 2000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REPORT_REASONS: { value: ChatReportReason; key: TranslationKey }[] = [
  { value: "SPAM", key: "adminx.chat.reason.SPAM" },
  { value: "HARASSMENT", key: "adminx.chat.reason.HARASSMENT" },
  { value: "FRAUD", key: "adminx.chat.reason.FRAUD" },
  { value: "INAPPROPRIATE", key: "adminx.chat.reason.INAPPROPRIATE" },
  { value: "OTHER", key: "adminx.chat.reason.OTHER" },
];

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null); // message id being reported
  const [reason, setReason] = useState<ChatReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const blocked = !!thread.data?.conversation.blocked;
  const blockedByMe = !!thread.data?.conversation.blockedByMe;
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

  const sendImage = async (file: File | undefined) => {
    if (!file || !id || sending) return;
    if (!file.type.startsWith("image/")) {
      setNotice(t("manage.chat.imageOnly"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice(t("manage.chat.imageTooBig"));
      return;
    }
    setSending(true);
    setNotice(null);
    setSendError(false);
    try {
      const sent = await api.sendChatImage(id, file, draft);
      setDraft("");
      thread.setData((prev) => (prev ? { ...prev, messages: [...prev.messages, sent] } : prev));
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleBlock = async () => {
    if (!id) return;
    setNotice(null);
    try {
      await api.setChatBlocked(id, !blockedByMe);
      await thread.reload();
    } catch {
      setNotice(t("manage.chat.actionFailed"));
    }
  };

  const submitReport = async () => {
    if (!id) return;
    setNotice(null);
    try {
      await api.reportChat(id, { messageId: reporting === "general" ? undefined : (reporting ?? undefined), reason, details: details.trim() || undefined });
      setReporting(null);
      setDetails("");
      setNotice(t("manage.chat.reported"));
    } catch {
      setNotice(t("manage.chat.actionFailed"));
    }
  };

  const shopSide = thread.data?.conversation.viewerSide ? thread.data.conversation.viewerSide === "business" : isOwner;
  const title = thread.data ? (shopSide ? thread.data.conversation.consumerName : thread.data.conversation.businessName) : "";

  return (
    <RoleLayout>
      <div className="max-w-[428px] md:max-w-3xl mx-auto flex flex-col" style={{ minHeight: "calc(100vh - 230px)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/chat" aria-label={t("manage.chat.back")} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#121F3E]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold font-rubik text-[#111111] truncate">{title || t("manage.chat.title")}</h1>
          {thread.data && (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setReporting("general")}
                aria-label={t("manage.chat.reportUser")}
                title={t("manage.chat.reportUser")}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#555555]"
              >
                <Flag className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void toggleBlock()}
                aria-label={blockedByMe ? t("manage.chat.unblock") : t("manage.chat.block")}
                title={blockedByMe ? t("manage.chat.unblock") : t("manage.chat.block")}
                aria-pressed={blockedByMe}
                className={`w-9 h-9 rounded-full shadow-sm flex items-center justify-center ${blockedByMe ? "bg-[#ED4C5C] text-white" : "bg-white text-[#555555]"}`}
              >
                <Ban className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {blocked && (
          <p role="status" className="mb-2 bg-[#FFF6DB] border border-[#D4B011] text-[#121F3E] text-xs rounded-xl p-3">
            {blockedByMe ? t("manage.chat.blockedByMe") : t("manage.chat.blockedByOther")}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-2 bg-[#FAE2F0] text-[#790166] text-xs font-bold rounded-xl p-3">
            {notice}
          </p>
        )}
        {reporting && (
          <div className="mb-3 bg-white border border-[#EAEAEA] rounded-2xl p-4 space-y-3 text-xs">
            <p className="font-bold text-[#111111]">{t("manage.chat.reportTitle")}</p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ChatReportReason)}
              aria-label={t("manage.chat.reportReason")}
              className="h-10 w-full bg-white border border-[#EAEAEA] rounded-xl px-3 font-bold"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.key)}
                </option>
              ))}
            </select>
            <textarea
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              placeholder={t("manage.chat.reportDetails")}
              aria-label={t("manage.chat.reportDetails")}
              className="w-full bg-[#EAEAEA] rounded-xl p-3"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void submitReport()} className="font-bold text-[#FA1EFF]">
                {t("manage.chat.reportSend")}
              </button>
              <button type="button" onClick={() => setReporting(null)} className="font-bold text-[#555555]">
                {t("manage.chat.reportCancel")}
              </button>
            </div>
          </div>
        )}

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
                {m.attachmentUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.attachmentUrl} alt={t("manage.chat.photo")} loading="lazy" className="max-h-64 rounded-xl mb-1" />
                )}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={`mt-1 text-[10px] flex items-center gap-2 ${m.mine ? "text-white/70" : "text-[#B7B7B7]"}`}>
                  {fmt.time(m.createdAt)}
                  {!m.mine && (
                    <button
                      type="button"
                      onClick={() => setReporting(m.id)}
                      aria-label={t("manage.chat.reportMessage")}
                      title={t("manage.chat.reportMessage")}
                      className="hover:text-[#ED4C5C]"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </p>
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label={t("manage.chat.attach")}
            onChange={(e) => void sendImage(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={sending || blocked}
            onClick={() => fileRef.current?.click()}
            aria-label={t("manage.chat.attach")}
            className="w-11 h-11 shrink-0 rounded-full bg-white shadow-sm text-[#555555] flex items-center justify-center disabled:opacity-40"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
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
            disabled={blocked}
            maxLength={MAX_LENGTH}
            placeholder={t("manage.chat.placeholder")}
            aria-label={t("manage.chat.placeholder")}
            className="flex-1 max-h-28 resize-none bg-[#EAEAEA] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
          />
          <button
            type="submit"
            disabled={sending || blocked || !draft.trim()}
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
