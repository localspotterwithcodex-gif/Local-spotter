/** Platforms a shop can link to. Keep in sync with frontend/src/lib/social-links.ts. */
export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
  'pinterest',
  'whatsapp',
  'snapchat',
  'threads',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const MAX_SOCIAL_LINKS = SOCIAL_PLATFORMS.length;

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

/** One link per platform (the last one wins), blank URLs dropped, stable platform order. */
export function normalizeSocialLinks(links: SocialLink[]): SocialLink[] {
  const byPlatform = new Map<SocialPlatform, string>();
  for (const l of links) {
    const url = l.url.trim();
    if (url) byPlatform.set(l.platform, url);
  }
  return SOCIAL_PLATFORMS.filter((p) => byPlatform.has(p)).map((platform) => ({ platform, url: byPlatform.get(platform) as string }));
}
