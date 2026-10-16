"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Check, Search, LocateFixed, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import type { Business } from "@/types/business";

type GeoHit = { lat: string; lon: string; display_name: string };

function LocationForm({ business }: { business: Business }) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();

  const [state, setState] = useState(business.location.province);
  const [city, setCity] = useState(business.location.city);
  const [street, setStreet] = useState(business.location.street);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const initialCoords =
    business.location.lat !== 0 || business.location.lng !== 0 ? { lat: business.location.lat, lng: business.location.lng } : null;
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords);
  const [latText, setLatText] = useState(initialCoords ? String(initialCoords.lat) : "");
  const [lngText, setLngText] = useState(initialCoords ? String(initialCoords.lng) : "");
  const [candidates, setCandidates] = useState<GeoHit[]>([]);
  const [approximate, setApproximate] = useState(false);
  // True once the address fields differ from what the saved pin was made for.
  const [pinStale, setPinStale] = useState(false);
  const [locating, setLocating] = useState<"" | "address" | "device">("");
  const [mapError, setMapError] = useState("");

  const applyCoords = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setLatText(String(lat));
    setLngText(String(lng));
    setPinStale(false);
  };

  const onAddressEdit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPinStale(true);
  };

  // Hand-edited coordinates move the pin.
  const onCoordEdit = (which: "lat" | "lng", value: string) => {
    const nextLat = which === "lat" ? value : latText;
    const nextLng = which === "lng" ? value : lngText;
    setLatText(nextLat);
    setLngText(nextLng);
    const la = Number(nextLat.replace(",", "."));
    const ln = Number(nextLng.replace(",", "."));
    if (nextLat.trim() && nextLng.trim() && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
      setCoords({ lat: la, lng: ln });
      setPinStale(false);
    }
  };

  const geocode = async (q: string): Promise<GeoHit[]> => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${locale}&q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error("geocode");
    return (await res.json()) as GeoHit[];
  };

  /** Looks the typed address up; never edits the typed fields, and lets the owner pick the right result. */
  const findOnMap = async () => {
    setMapError("");
    setCandidates([]);
    setApproximate(false);
    setLocating("address");
    try {
      let hits = await geocode([street, city, state].filter(Boolean).join(", "));
      let approx = false;
      if (!hits.length && street) {
        hits = await geocode([city, state].filter(Boolean).join(", "));
        approx = hits.length > 0;
      }
      if (!hits.length) {
        setMapError(t("manage.location.notFound"));
        return;
      }
      setApproximate(approx);
      setCandidates(hits);
      applyCoords(Number(hits[0].lat), Number(hits[0].lon));
    } catch {
      setMapError(t("manage.location.lookupFailed"));
    } finally {
      setLocating("");
    }
  };

  const useMyLocation = () => {
    setMapError("");
    if (!navigator.geolocation) {
      setMapError(t("manage.location.noGeolocation"));
      return;
    }
    setLocating("device");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude);
        setCandidates([]);
        setApproximate(false);
        setLocating("");
      },
      () => {
        setMapError(t("manage.location.denied"));
        setLocating("");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pinStale) {
      setError(t("manage.location.staleCoords"));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.updateBusiness(business.id, {
        state,
        city,
        address: street,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      });
      setIsSaved(true);
      router.push("/owner");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.location.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">
              {t("ownerx.location.subtitle")}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("ownerx.location.state")}
                value={state}
                onChange={onAddressEdit(setState)}
                required
              />
              <Input
                label={t("ownerx.location.city")}
                value={city}
                onChange={onAddressEdit(setCity)}
                required
              />
            </div>

            <Input
              label={t("ownerx.location.street")}
              icon={<MapPin className="w-4 h-4 text-[#54D1CA]" />}
              value={street}
              onChange={onAddressEdit(setStreet)}
              required
            />

            {/* Interactive Map Location Pin Preview */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-bold text-[#111111]">{t("ownerx.location.mapPreview")}</label>
              {coords ? (
                <iframe
                  title={t("ownerx.location.mapPreview")}
                  className="h-56 w-full rounded-2xl border border-[#54D1CA]/30"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.006}%2C${coords.lat - 0.004}%2C${coords.lng + 0.006}%2C${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                />
              ) : (
                <div className="h-56 w-full bg-[#54D1CA]/10 rounded-2xl border border-[#54D1CA]/30 flex flex-col items-center justify-center text-center px-4">
                  <MapPin className="w-8 h-8 text-[#54D1CA] mb-2" />
                  <span className="text-xs text-[#555555]">{t("ownerx.location.gpsNotSet")}</span>
                </div>
              )}
              {coords && (
                <span className="text-[10px] text-[#B7B7B7]">
                  {t("ownerx.location.gps", {
                    lat: f.number(coords.lat, { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
                    lng: f.number(coords.lng, { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
                  })}
                </span>
              )}
              {mapError && <p className="text-xs font-bold text-[#E54666]">{mapError}</p>}
              {pinStale && <p className="text-xs font-bold text-[#B7791F]">{t("manage.location.staleCoords")}</p>}
              {approximate && <p className="text-xs font-bold text-[#B7791F]">{t("manage.location.approximate")}</p>}
              {candidates.length > 1 && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#111111]">{t("manage.location.pickResult")}</span>
                  <ul className="space-y-1">
                    {candidates.map((c) => {
                      const active = coords !== null && coords.lat === Number(c.lat) && coords.lng === Number(c.lon);
                      return (
                        <li key={`${c.lat}-${c.lon}`}>
                          <button
                            type="button"
                            onClick={() => applyCoords(Number(c.lat), Number(c.lon))}
                            className={`w-full text-left text-xs rounded-xl border px-3 py-2 ${active ? "border-[#54D1CA] bg-[#54D1CA]/10 font-bold" : "border-[#EAEAEA] bg-white hover:bg-[#F9F9F9]"}`}
                          >
                            {c.display_name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("ownerx.settings.lat")} value={latText} onChange={(e) => onCoordEdit("lat", e.target.value)} />
                <Input label={t("ownerx.settings.lng")} value={lngText} onChange={(e) => onCoordEdit("lng", e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="secondary" size="sm" className="flex-1 gap-1" onClick={findOnMap} isLoading={locating === "address"} disabled={!!locating}>
                  <Search className="w-4 h-4" /> {t("manage.location.findAddress")}
                </Button>
                <Button type="button" variant="secondary" size="sm" className="flex-1 gap-1" onClick={useMyLocation} isLoading={locating === "device"} disabled={!!locating}>
                  <LocateFixed className="w-4 h-4" /> {t("manage.location.useMine")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Button type="submit" variant="primary" size="lg" className="flex-1 gap-1" isLoading={isSubmitting}>
                {isSaved ? (
                  <>
                    <Check className="w-5 h-5" /> {t("ownerx.location.saved")}
                  </>
                ) : (
                  t("ownerx.location.confirm")
                )}
              </Button>
            </div>
          </form>
        </div>
    </>
  );
}

export default function ShoprouteLocationPage() {
  const { t } = useLocale();
  const { business, loading, error, reload } = useMyBusiness();

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>
        {loading ? (
          <LoadingState label={t("ownerx.loadingShop")} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !business ? (
          <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forLocation")} />
        ) : (
          <LocationForm business={business} />
        )}
      </div>
    </OwnerLayout>
  );
}
