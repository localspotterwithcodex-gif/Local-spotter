/** Platforms a shop can link to. Keep in sync with backend/src/businesses/social-links.ts. */
export const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "pinterest", "whatsapp", "snapchat", "threads"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  whatsapp: "WhatsApp",
  snapchat: "Snapchat",
  threads: "Threads",
};

export const SOCIAL_PLACEHOLDER: Record<SocialPlatform, string> = {
  instagram: "https://instagram.com/…",
  facebook: "https://facebook.com/…",
  tiktok: "https://tiktok.com/@…",
  youtube: "https://youtube.com/@…",
  x: "https://x.com/…",
  linkedin: "https://linkedin.com/company/…",
  pinterest: "https://pinterest.com/…",
  whatsapp: "https://wa.me/31612345678",
  snapchat: "https://snapchat.com/add/…",
  threads: "https://threads.net/@…",
};

export const isSocialPlatform = (v: unknown): v is SocialPlatform => typeof v === "string" && (SOCIAL_PLATFORMS as readonly string[]).includes(v);

/** Same rule the settings form applies to every link (the server validates again). */
export const isHttpUrl = (v: string) => /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v.trim());

/** Reads the stored list; falls back to the three legacy single-link columns for shops saved before the list existed. */
export function readSocialLinks(raw: unknown, legacy: { instagram?: string | null; facebook?: string | null; tiktok?: string | null }): SocialLink[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((x): SocialLink[] => {
      const o = x as { platform?: unknown; url?: unknown } | null;
      return o && isSocialPlatform(o.platform) && typeof o.url === "string" && o.url ? [{ platform: o.platform, url: o.url }] : [];
    });
  }
  const out: SocialLink[] = [];
  if (legacy.instagram) out.push({ platform: "instagram", url: legacy.instagram });
  if (legacy.facebook) out.push({ platform: "facebook", url: legacy.facebook });
  if (legacy.tiktok) out.push({ platform: "tiktok", url: legacy.tiktok });
  return out;
}
