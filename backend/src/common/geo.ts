/** Small geo helpers for "near me" queries (no PostGIS needed at this scale). */

const EARTH_RADIUS_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rectangle that fully contains the circle; used as a cheap DB pre-filter. */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const cos = Math.max(0.01, Math.cos(toRad(lat)));
  const dLng = dLat / cos;
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

export interface GeoQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export function hasGeo(q: GeoQuery): q is Required<GeoQuery> {
  return q.lat !== undefined && q.lng !== undefined && q.radiusKm !== undefined;
}

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const WALKING_SPEED_KMH = 4.8;
export const MINUTES_PER_STOP = 10;

/**
 * Distance along the stops in order (straight lines between consecutive stops) and an estimated
 * duration: walking time plus a visiting time per stop, rounded to 5 minutes.
 */
export function routeStats(stops: { latitude: unknown; longitude: unknown; sequence?: number }[]) {
  const pts = [...stops]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((s) => ({ lat: toNum(s.latitude), lng: toNum(s.longitude) }))
    .filter((p): p is { lat: number; lng: number } => p.lat !== null && p.lng !== null);
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  const distanceKm = Math.round(km * 100) / 100;
  const raw = (km / WALKING_SPEED_KMH) * 60 + pts.length * MINUTES_PER_STOP;
  const durationMinutes = pts.length === 0 ? 0 : Math.max(5, Math.round(raw / 5) * 5);
  return { distanceKm, durationMinutes };
}
