"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Path ("/businesses/123") or absolute URL; paths are resolved against the current origin. */
  href: string;
  title: string;
  className?: string;
}

/** Absolute, shareable URL for an in-app path. */
export function toShareUrl(href: string, origin: string): string {
  try {
    return new URL(href, origin).toString();
  } catch {
    return href;
  }
}

/**
 * One click gives the person a link to pass on: the device share sheet where the browser has one
 * (phones), otherwise the link is copied to the clipboard. If both are unavailable the link is
 * shown in a selectable field so it can still be copied by hand.
 */
export const ShareButton: React.FC<ShareButtonProps> = ({ href, title, className }) => {
  const { t } = useLocale();
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const share = async () => {
    const link = toShareUrl(href, window.location.origin);
    setUrl(link);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: link });
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return; // person closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("manual");
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={share}
        aria-label={t("share.button")}
        title={t("share.button")}
        className={cn("w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#FA1EFF] shadow", className)}
      >
        {state === "copied" ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{state === "copied" ? t("share.copied") : ""}</span>
      {state === "copied" && (
        <span className="absolute right-0 top-11 z-20 whitespace-nowrap rounded-lg bg-[#121F3E] px-2.5 py-1 text-[11px] font-bold text-white shadow">
          {t("share.copied")}
        </span>
      )}
      {state === "manual" && (
        <span className="absolute right-0 top-11 z-20 w-64 rounded-xl bg-white p-2 shadow-lg border border-[#EAEAEA]">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            aria-label={t("share.button")}
            className="w-full rounded-lg bg-[#F3F3F3] px-2 py-1.5 text-xs"
          />
        </span>
      )}
    </span>
  );
};
