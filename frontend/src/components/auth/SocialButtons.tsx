"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingBag, Store } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api/client";
import type { User, UserRole } from "@/types/user";

// Public identifiers (not secrets). The buttons only render when they are configured.
const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
const FACEBOOK_APP_ID = (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "").trim();

type Provider = "google" | "facebook";

interface GoogleId {
  initialize: (cfg: { client_id: string; callback: (r: { credential?: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
}
interface FacebookSdk {
  init: (cfg: { appId: string; version: string; cookie: boolean; xfbml: boolean }) => void;
  login: (cb: (r: { authResponse?: { accessToken: string } | null }) => void, opts: { scope: string }) => void;
}
type SdkWindow = Window & { google?: { accounts: { id: GoogleId } }; FB?: FacebookSdk; fbAsyncInit?: () => void };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script")));
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => {
      el.dataset.loaded = "1";
      resolve();
    };
    el.onerror = () => reject(new Error("script"));
    document.head.appendChild(el);
  });
}

interface Props {
  /** Called after a successful sign-in; the page decides where to go next. */
  onSuccess: (user: User) => void;
  onError: (message: string) => void;
}

/**
 * "Continue with Google / Facebook". The browser obtains a token from the
 * provider, the backend verifies it with the provider and issues the normal
 * HttpOnly session cookie. A brand-new account asks once which kind it is.
 */
export const SocialButtons: React.FC<Props> = ({ onSuccess, onError }) => {
  const { socialLogin } = useAuth();
  const { t } = useLocale();
  const googleRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ provider: Provider; token: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const providerName = (p: Provider) => (p === "google" ? t("manage.social.google") : t("manage.social.facebook"));

  const attempt = useCallback(
    async (provider: Provider, token: string, role?: UserRole) => {
      setBusy(true);
      try {
        const user = await socialLogin(provider, token, role);
        setPending(null);
        onSuccess(user);
      } catch (err) {
        const body = err instanceof ApiError ? (err.body as { code?: string } | null) : null;
        if (err instanceof ApiError && err.status === 409 && body?.code === "ROLE_REQUIRED") {
          setPending({ provider, token });
        } else if (err instanceof ApiError && err.status === 503) {
          setPending(null);
          onError(t("manage.social.unavailable", { provider: providerName(provider) }));
        } else if (err instanceof ApiError && err.status === 400) {
          setPending(null);
          onError(t("manage.social.noEmail", { provider: providerName(provider) }));
        } else {
          setPending(null);
          onError(t("manage.social.failed", { provider: providerName(provider) }));
        }
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [socialLogin, onSuccess, onError, t]
  );
  const attemptRef = useRef(attempt);
  useEffect(() => {
    attemptRef.current = attempt;
  });

  // Google renders its own (policy-compliant) button.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        const id = (window as SdkWindow).google?.accounts.id;
        if (cancelled || !id || !googleRef.current) return;
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => {
            if (r.credential) void attemptRef.current("google", r.credential);
          },
        });
        id.renderButton(googleRef.current, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 200 });
      })
      .catch(() => onError(t("manage.social.unavailable", { provider: providerName("google") })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const facebookLogin = async () => {
    try {
      const w = window as SdkWindow;
      if (!w.FB) {
        await loadScript("https://connect.facebook.net/en_US/sdk.js");
      }
      const FB = w.FB;
      if (!FB) throw new Error("sdk");
      FB.init({ appId: FACEBOOK_APP_ID, version: "v19.0", cookie: false, xfbml: false });
      FB.login(
        (r) => {
          if (r.authResponse?.accessToken) void attemptRef.current("facebook", r.authResponse.accessToken);
        },
        { scope: "public_profile,email" }
      );
    } catch {
      onError(t("manage.social.unavailable", { provider: providerName("facebook") }));
    }
  };

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[11px] text-[#B7B7B7]">
        <span className="flex-1 h-px bg-[#EAEAEA]" />
        {t("manage.social.or")}
        <span className="flex-1 h-px bg-[#EAEAEA]" />
      </div>
      <div className="flex flex-col items-center gap-3">
        {GOOGLE_CLIENT_ID && <div ref={googleRef} className="min-h-10" aria-label={t("manage.social.google")} />}
        {FACEBOOK_APP_ID && (
          <button
            type="button"
            onClick={facebookLogin}
            disabled={busy}
            className="w-[200px] h-10 rounded-full border border-[#DADCE0] bg-white text-[#121F3E] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#F9F9F9] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1877F2]" fill="currentColor" aria-hidden="true">
              <path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V13h2.8v8h3.2z" />
            </svg> {t("manage.social.facebook")}
          </button>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t("manage.social.chooseRole")}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl text-center space-y-4">
            <h2 className="text-lg font-bold font-rubik text-[#111111]">{t("manage.social.chooseRole")}</h2>
            <p className="text-xs text-[#B7B7B7]">{t("manage.social.roleHint")}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void attempt(pending.provider, pending.token, "CONSUMER")}
              className="w-full p-4 rounded-2xl border-2 border-[#FAE2F0] bg-[#F9F9F9] hover:bg-[#FAE2F0] hover:border-[#FA1EFF] flex items-center gap-3 text-left text-sm font-bold text-[#111111] disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-xl bg-[#FA1EFF] text-white flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </span>
              {t("manage.social.consumer")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void attempt(pending.provider, pending.token, "BUSINESS_OWNER")}
              className="w-full p-4 rounded-2xl border-2 border-[#121F3E]/20 bg-[#F9F9F9] hover:bg-[#121F3E]/10 hover:border-[#121F3E] flex items-center gap-3 text-left text-sm font-bold text-[#111111] disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-xl bg-[#121F3E] text-white flex items-center justify-center">
                <Store className="w-5 h-5" />
              </span>
              {t("manage.social.owner")}
            </button>
            <button type="button" onClick={() => setPending(null)} className="text-xs font-bold text-[#B7B7B7] hover:underline">
              {t("manage.social.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
