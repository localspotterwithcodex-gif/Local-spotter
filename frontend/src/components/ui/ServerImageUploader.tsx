"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { api, type UploadedImage } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { errorCode } from "@/lib/errors";
import type { TranslationKey } from "@/i18n/dictionaries";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 2000;
/** Browsers/OSes often report an empty MIME type for AVIF, HEIC or JFIF files, so the extension counts too. */
const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i;

const looksLikeImage = (file: File) => file.type.startsWith("image/") || IMAGE_EXT.test(file.name);

/**
 * Re-encodes the photo in the browser (WebP, longest edge 2000 px) so any format
 * the browser can decode, and any phone-sized photo, uploads quickly. If the
 * browser cannot decode it (e.g. HEIC in Chrome) the original goes to the
 * server, which checks the real type and lets Cloudinary convert it.
 */
async function prepareImage(file: File, maxEdge: number): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob || blob.size >= file.size && scale === 1) return file;
    const ext = blob.type === "image/webp" ? "webp" : "png";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch {
    return file;
  }
}

interface Props {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  label?: string;
  /** Called with true while uploads are in flight so the parent can disable its submit button. */
  onBusyChange?: (busy: boolean) => void;
  /** Longest edge after in-browser re-encoding (default 2000; a 360° photo needs more). */
  maxEdge?: number;
}

/**
 * Uploads each chosen photo to the backend immediately (the backend validates
 * the real file type and stores it in Cloudinary) and reports the stored
 * { id, url } pairs. Nothing is kept in the browser beyond a preview.
 */
export const ServerImageUploader: React.FC<Props> = ({ value, onChange, max = 3, label, onBusyChange, maxEdge = MAX_EDGE }) => {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ key: string; preview: string }[]>([]);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const uploadedCount = value.length;
  const total = uploadedCount + pending.length;

  const failureKey = (err: unknown): TranslationKey => {
    if (err instanceof ApiError) {
      if (err.status === 403 && errorCode(err) === "ORIGIN_BLOCKED") return "error.originBlocked";
      if (err.status === 401) return "error.unauthorized";
      if (err.status === 503) return "manage.upload.errUnavailable";
      if (err.status === 413) return "manage.upload.errSize";
      if (err.status === 400) return "manage.upload.errType";
    }
    return "manage.upload.errFailed";
  };

  const handleFiles = async (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    setErrorKey(null);
    const files = Array.from(list).slice(0, Math.max(0, max - total));
    let current = value;
    onBusyChange?.(true);
    try {
      for (const file of files) {
        if (!looksLikeImage(file)) {
          setErrorKey("manage.upload.errType");
          continue;
        }
        const key = `${file.name}-${file.size}-${Date.now()}`;
        const preview = URL.createObjectURL(file);
        setPending((p) => [...p, { key, preview }]);
        try {
          const prepared = await prepareImage(file, maxEdge);
          if (prepared.size > MAX_BYTES) {
            setErrorKey("manage.upload.errSize");
            continue;
          }
          const uploaded = await api.uploadImage(prepared);
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
        {total < max && (
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-[#B7B7B7] flex flex-col items-center justify-center gap-1 text-[#B7B7B7] hover:border-[#FA1EFF] hover:text-[#FA1EFF] transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("manage.upload.camera")}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.jfif"
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
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            void handleFiles([file]);
          }}
          onFallback={() => {
            setCameraOpen(false);
            cameraInputRef.current?.click();
          }}
        />
      )}
      {/* Phones without live camera access fall back to the system camera app. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
};

interface CameraProps {
  onClose: () => void;
  onCapture: (file: File) => void;
  /** Used when the browser has no live camera API: open the device's camera app / file picker instead. */
  onFallback: () => void;
}

/** Live camera preview in a dialog; the captured frame is returned as a JPEG File and uploaded like any other photo. */
const CameraCapture: React.FC<CameraProps> = ({ onClose, onCapture, onFallback }) => {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [ready, setReady] = useState(false);
  const hasCameraApi = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!hasCameraApi) {
      onFallback();
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setErrorKey(null);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setErrorKey(name === "NotFoundError" || name === "OverconstrainedError" ? "manage.upload.cameraUnavailable" : "manage.upload.cameraDenied");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, hasCameraApi]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={t("manage.upload.cameraTitle")}>
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("manage.upload.cameraTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("manage.upload.cameraClose")} className="w-8 h-8 rounded-full bg-[#F9F9F9] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        {errorKey ? (
          <p role="alert" className="text-xs font-bold text-[#E54666]">
            {t(errorKey)}
          </p>
        ) : (
          <video ref={videoRef} playsInline muted className="w-full rounded-2xl bg-black aspect-[4/3] object-cover" />
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setReady(false);
              setFacing((f) => (f === "environment" ? "user" : "environment"));
            }}
            aria-label={t("manage.upload.cameraFlip")}
            className="w-10 h-10 rounded-full border border-[#EAEAEA] flex items-center justify-center text-[#121F3E]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!ready || !!errorKey}
            className="px-6 h-11 rounded-full bg-[#FA1EFF] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {t("manage.upload.capture")}
          </button>
          <button type="button" onClick={onFallback} className="text-xs font-bold text-[#B7B7B7] hover:underline">
            {t("manage.upload.choose")}
          </button>
        </div>
      </div>
    </div>
  );
};
