/** Looks an address up with OpenStreetMap Nominatim (browser-side, same as the shop location page). */
export async function geocodeFirst(queries: string[], language: string): Promise<{ lat: number; lng: number } | null> {
  for (const q of queries.map((x) => x.trim()).filter(Boolean)) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(language)}&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      const hits = (await res.json()) as { lat: string; lon: string }[];
      const lat = Number(hits[0]?.lat);
      const lng = Number(hits[0]?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    } catch {
      /* try the next, broader query */
    }
  }
  return null;
}
