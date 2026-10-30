"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mic, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleContext";
import { downscaleImage } from "./downscaleImage";

interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  /** Pass this to show the camera button (search by photo): receives the keywords describing the photo. */
  onImageKeywords?: (keywords: string[]) => void;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/** Search box with a microphone (speech to text, built into the browser) and an optional camera (search by photo). */
export function SmartSearchInput({ value, onChange, placeholder, onImageKeywords }: Props) {
  const { t, locale } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Messages float under the box (absolute) so they never push the filter button or the page; they fade out by themselves.
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 6000);
    return () => window.clearTimeout(id);
  }, [message]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setCanSpeak(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);

  const toggleMic = useCallback(() => {
    setMessage(null);
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = locale === "nl" ? "nl-NL" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onChange(text);
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      setMessage(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? t("manage.vsearch.micDenied")
          : e.error === "no-speech"
          ? t("manage.vsearch.noSpeech")
          : e.error === "network"
          ? t("manage.vsearch.micNetwork")
          : t("manage.vsearch.micFailed"),
      );
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, locale, onChange, t]);

  const onFile = async (file: File | undefined) => {
    if (!file || !onImageKeywords) return;
    setMessage(null);
    setBusy(true);
    try {
      const blob = await downscaleImage(file);
      const { keywords } = await api.searchByImage(blob);
      if (keywords.length === 0) setMessage(t("manage.vsearch.nothing"));
      else onImageKeywords(keywords);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setMessage(t("manage.vsearch.tooMany"));
      else if (err instanceof ApiError && err.status === 400) setMessage(t("manage.vsearch.badImage"));
      else if (err instanceof ApiError && err.status === 503) setMessage(t("manage.vsearch.notSetUp"));
      else setMessage(t("manage.vsearch.failed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const iconBtn = "h-9 w-9 rounded-full flex items-center justify-center text-[#555555] hover:bg-white hover:text-[#FA1EFF] transition-colors disabled:opacity-50";

  const floating = "absolute left-0 top-full z-20 mt-1 max-w-full rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold shadow-md";
  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          placeholder={placeholder}
          icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={onImageKeywords && canSpeak ? "pr-24" : onImageKeywords || canSpeak ? "pr-14" : ""}
          aria-label={placeholder}
        />
        <div className="absolute right-2 top-1.5 flex items-center gap-0.5">
          {canSpeak && (
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={listening}
              aria-label={listening ? t("manage.vsearch.micStop") : t("manage.vsearch.micStart")}
              title={listening ? t("manage.vsearch.listening") : t("manage.vsearch.micStart")}
              className={`${iconBtn} ${listening ? "bg-[#FA1EFF] !text-white animate-pulse" : ""}`}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          {onImageKeywords && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-label={t("manage.vsearch.photo")}
                title={t("manage.vsearch.photo")}
                className={iconBtn}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </>
          )}
        </div>
      </div>
      {listening && <p role="status" className={`${floating} text-[#FA1EFF]`}>{t("manage.vsearch.listening")}</p>}
      {message && <p role="alert" className={`${floating} text-[#E54666]`}>{message}</p>}
    </div>
  );
}
