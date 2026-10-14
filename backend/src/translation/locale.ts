export type Locale = 'en' | 'nl';
export const LOCALES: readonly Locale[] = ['en', 'nl'];

/** Picks 'en' | 'nl' from `?lang=` or the Accept-Language header; undefined if neither is usable. */
export function resolveLocale(req: { query?: Record<string, unknown>; headers?: Record<string, unknown> }): Locale | undefined {
  const fromQuery = typeof req.query?.lang === 'string' ? req.query.lang : undefined;
  const header = typeof req.headers?.['accept-language'] === 'string' ? (req.headers['accept-language'] as string) : undefined;
  const raw = (fromQuery ?? header ?? '').trim().toLowerCase();
  if (!raw) return undefined;
  const first = raw.split(',')[0].trim().slice(0, 2);
  return (LOCALES as readonly string[]).includes(first) ? (first as Locale) : undefined;
}
