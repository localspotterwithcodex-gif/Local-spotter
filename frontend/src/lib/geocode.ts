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

/** Valid WGS84 coordinates that are not the (0, 0) "no location yet" placeholder. */
export function hasCoords(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);
}

/** Embeddable OpenStreetMap view centred on the pin (no API key needed). */
export function osmEmbedUrl(lat: number, lng: number, span = 0.006): string {
  const bbox = [lng - span, lat - span * 0.66, lng + span, lat + span * 0.66].map((n) => n.toFixed(6)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
export const googleDirectionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
