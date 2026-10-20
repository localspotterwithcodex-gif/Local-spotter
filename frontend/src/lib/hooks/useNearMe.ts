"use client";

import { useCallback, useState } from "react";

export type NearMeError = "filters.nearMeUnsupported" | "filters.nearMeDenied" | "filters.nearMeFailed";

export interface NearMeState {
  active: boolean;
  coords: { lat: number; lng: number } | null;
  radiusKm: number;
  /** i18n key of the last failure, if any. */
  error: NearMeError | null;
  enable: () => void;
  disable: () => void;
  setRadiusKm: (km: number) => void;
}

/** Opt-in "near me": asks the browser for the position only when the visitor turns it on. */
export function useNearMe(defaultRadiusKm = 25): NearMeState {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [active, setActive] = useState(false);
  const [radiusKm, setRadiusKm] = useState(defaultRadiusKm);
  const [error, setError] = useState<NearMeError | null>(null);

  const enable = useCallback(() => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("filters.nearMeUnsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setActive(true);
      },
      (err) => setError(err.code === err.PERMISSION_DENIED ? "filters.nearMeDenied" : "filters.nearMeFailed"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const disable = useCallback(() => {
    setActive(false);
    setError(null);
  }, []);

  return { active, coords, radiusKm, error, enable, disable, setRadiusKm };
}
