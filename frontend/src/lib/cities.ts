/**
 * Distinct, display-ready city names from owner-supplied data.
 * Case/whitespace-insensitive de-duplication; first spelling wins; sorted A–Z.
 */
export function uniqueCities(values: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const city = (raw ?? "").trim();
    if (!city) continue;
    const key = city.toLocaleLowerCase();
    if (!seen.has(key)) seen.set(key, city);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
