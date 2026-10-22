"use client";

import React, { useEffect, useRef, useState } from "react";
import { Film, Loader2, Trash2, Upload } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { api, type UploadedImage } from "@/lib/api";

/** Mirrors the backend limits (backend/src/media/video-storage.ts); the server re-checks everything. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_EXT = /\.(mp4|mov|webm)$/i;
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

interface Props {
  /** The current video ({ id, url }) or null. One video per shop. */
  value: UploadedImage | null;
  onChange: (video: UploadedImage | null) => void;
  label?: string;
  /** True while an upload is in flight so the parent can disable its submit button. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Uploads one shop video directly to storage (see api.uploadShopVideo) and reports the stored
 * { id, url }. The asset only becomes part of the shop when the parent form is saved.
 */
export function ShopVideoUploader({ value, onChange, label, onBusyChange }: Props) {
  const { t } = useLocale();
  const describe = useErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cancel an in-flight upload when the form unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const okType = VIDEO_TYPES.includes(file.type) || VIDEO_EXT.test(file.name);
    if (!okType) {
      setError(t("manage.video.errType"));
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(t("manage.video.errSize"));
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    onBusyChange?.(true);
    try {
      const uploaded = await api.uploadShopVideo(file, setProgress, controller.signal);
      onChange(uploaded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "VIDEO_UPLOAD_ABORTED") return;
      if (msg === "VIDEO_TOO_LARGE") setError(t("manage.video.errSize"));
      else if (msg === "VIDEO_UPLOAD_FAILED") setError(t("manage.video.errUpload"));
      else setError(describe(err));
    } finally {
      abortRef.current = null;
      setProgress(null);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploading = progress !== null;

  return (
    <div className="space-y-2">
      {label && <span className="text-sm font-bold text-[#111111] block">{label}</span>}

      {value && !uploading && (
        <div className="space-y-2">
          <video
            src={value.url}
            controls
            preload="metadata"
            playsInline
            className="w-full max-w-md rounded-xl border border-[#EEEEEE] bg-black aspect-video"
            aria-label={t("manage.video.previewAlt")}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline"
          >
            <Trash2 size={14} aria-hidden="true" /> {t("manage.video.remove")}
          </button>
        </div>
      )}

      {uploading && (
        <div className="max-w-md space-y-1" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {t("manage.video.uploading", { percent: String(Math.round((progress ?? 0) * 100)) })}
          </div>
          <div className="h-2 rounded-full bg-[#EEEEEE] overflow-hidden">
            <div className="h-full bg-[#111111] transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </div>
          <button type="button" onClick={() => abortRef.current?.abort()} className="text-xs font-bold text-[#6B6B6B] hover:underline">
            {t("manage.video.cancel")}
          </button>
        </div>
      )}

      {!uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full max-w-md rounded-xl border-2 border-dashed border-[#D9D9D9] px-4 py-5 text-sm font-bold text-[#6B6B6B] hover:border-[#111111] hover:text-[#111111] transition-colors"
        >
          {value ? <Upload size={18} aria-hidden="true" /> : <Film size={18} aria-hidden="true" />}
          {value ? t("manage.video.replace") : t("manage.video.choose")}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <p className="text-[11px] text-[#B7B7B7]">{t("manage.video.help")}</p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
