"use client";

import React, { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { api, type UploadedImage } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { TranslationKey } from "@/i18n/dictionaries";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  label?: string;
  /** Called with true while uploads are in flight so the parent can disable its submit button. */
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Uploads each chosen photo to the backend immediately (the backend validates
 * the real file type and stores it in Cloudinary) and reports the stored
 * { id, url } pairs. Nothing is kept in the browser beyond a preview.
 */
export const ServerImageUploader: React.FC<Props> = ({ value, onChange, max = 3, label, onBusyChange }) => {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ key: string; preview: string }[]>([]);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  const uploadedCount = value.length;
  const total = uploadedCount + pending.length;

  const failureKey = (err: unknown): TranslationKey => {
    if (err instanceof ApiError) {
      if (err.status === 503) return "manage.upload.errUnavailable";
      if (err.status === 413) return "manage.upload.errSize";
      if (err.status === 400) return "manage.upload.errType";
    }
    return "manage.upload.errFailed";
  };

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setErrorKey(null);
    const files = Array.from(list).slice(0, Math.max(0, max - total));
    let current = value;
    onBusyChange?.(true);
    try {
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setErrorKey("manage.upload.errType");
          continue;
        }
        if (file.size > MAX_BYTES) {
          setErrorKey("manage.upload.errSize");
          continue;
        }
        const key = `${file.name}-${file.size}-${Date.now()}`;
        const preview = URL.createObjectURL(file);
        setPending((p) => [...p, { key, preview }]);
        try {
          const uploaded = await api.uploadImage(file);
          current = [...current, uploaded];
          onChange(current);
        } catch (err) {
          setErrorKey(failureKey(err));
        } finally {
          URL.revokeObjectURL(preview);
          setPending((p) => p.filter((x) => x.key !== key));
        }
      }
    } finally {
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && <span className="text-sm font-bold text-[#111111]">{label}</span>}
        <span className="text-xs text-[#B7B7B7]">{t("manage.upload.count", { count: uploadedCount, max })}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#EAEAEA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={t("manage.upload.alt", { n: i + 1 })} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label={t("manage.upload.remove")}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {pending.map((p) => (
          <div key={p.key} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#EAEAEA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label={t("manage.upload.uploading")}>
              <Loader2 className="w-5 h-5 animate-spin text-[#FA1EFF]" />
            </div>
          </div>
        ))}

        {total < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-[#B7B7B7] flex flex-col items-center justify-center gap-1 text-[#B7B7B7] hover:border-[#FA1EFF] hover:text-[#FA1EFF] transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("manage.upload.add")}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <p className="text-xs text-[#B7B7B7]">{t("manage.upload.hint")}</p>
      {errorKey && (
        <p role="alert" className="text-xs font-bold text-[#E54666]">
          {t(errorKey)}
        </p>
      )}
    </div>
  );
};
