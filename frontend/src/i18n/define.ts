/**
 * Typed dictionary pair. The generic `K` is inferred from BOTH languages, so
 * a key that exists in `en` but not in `nl` (or vice versa) is a compile error.
 */
export function defineDict<const K extends string>(d: { en: Record<K, string>; nl: Record<K, string> }) {
  return d;
}

/** `{name}` placeholders used by a translation string. */
export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
