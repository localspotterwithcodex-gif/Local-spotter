export interface LatLng {
  lat: number;
  lng: number;
}

const hasCoords = (p: LatLng) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0);
const pt = (p: LatLng) => `${p.lat},${p.lng}`;

/** Google Maps limits the number of waypoints in a directions URL. */
export const MAX_WAYPOINTS = 9;

/**
 * Walking directions through all stops in order (Google Maps URL API).
 * Stops without coordinates are skipped. With more than MAX_WAYPOINTS+2 stops the
 * route is cut at the limit and `truncated` is true.
 */
export function googleRouteUrl(stops: LatLng[], origin?: LatLng | null): { url: string; truncated: boolean } | null {
  const pts = stops.filter(hasCoords);
  if (pts.length === 0) return null;
  const params = new URLSearchParams({ api: "1", travelmode: "walking" });
  if (origin && hasCoords(origin)) params.set("origin", pt(origin));
  else if (pts.length > 1) params.set("origin", pt(pts[0]));
  const rest = origin && hasCoords(origin) ? pts : pts.length > 1 ? pts.slice(1) : pts;
  const max = MAX_WAYPOINTS + 1; // waypoints + destination
  const used = rest.slice(0, max);
  const truncated = rest.length > max;
  const destination = used[used.length - 1];
  params.set("destination", pt(destination));
  const waypoints = used.slice(0, -1);
  if (waypoints.length) params.set("waypoints", waypoints.map(pt).join("|"));
  return { url: `https://www.google.com/maps/dir/?${params.toString().replace(/%2C/g, ",").replace(/%7C/g, "|")}`, truncated };
}

/** Apple Maps walking directions to one stop. */
export function appleStopUrl(stop: LatLng): string | null {
  return hasCoords(stop) ? `https://maps.apple.com/?daddr=${pt(stop)}&dirflg=w` : null;
}

/** Google Maps walking directions to one stop. */
export function googleStopUrl(stop: LatLng): string | null {
  return hasCoords(stop) ? `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${pt(stop)}` : null;
}

/** "1 h 15 min" / "45 min" from minutes. */
export function formatDuration(minutes: number, hourLabel = "h", minLabel = "min"): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} ${minLabel}`;
  return r === 0 ? `${h} ${hourLabel}` : `${h} ${hourLabel} ${r} ${minLabel}`;
}
