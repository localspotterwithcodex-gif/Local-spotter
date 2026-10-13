"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, MapPin, Phone, FileText, ArrowRight, Crosshair } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { getErrorMessage } from "@/lib/errors";

// Uses OpenStreetMap's free Nominatim reverse-geocoding endpoint. Swap this
// for Google/Mapbox by changing only this function if the project already
// has an API key for one of those. See PROMPT.md item 4.
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  );
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  return data.display_name as string;
}

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const { business: existingBusiness, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const categories = useApiResource("business-categories", () => api.getBusinessCategories());

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [storeName, setStoreName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [phone, setPhone] = useState("");
  const [kvkNumber, setKvkNumber] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError("GPS wordt niet ondersteund door deze browser.");
      return;
    }
    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const address = await reverseGeocode(latitude, longitude);
          setLocation(address);
        } catch {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setError("Kon je locatie niet ophalen. Vul het adres handmatig in.");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!storeName || !state || !city || !location || !phone || !kvkNumber || !shopDescription || !categoryId) {
      setError("Vul a.u.b. alle verplichte velden in.");
      return;
    }

    if (businessError) {
      setError("Je winkelgegevens konden niet worden gecontroleerd. Probeer het opnieuw.");
      return;
    }

    setIsSubmitting(true);
    try {
      const input = {
        name: storeName,
        state,
        city,
        address: location,
        latitude: coords?.lat,
        longitude: coords?.lng,
        phone,
        kvkNumber,
        description: shopDescription,
        categoryId,
      };
      // Returning owners (back button / refresh) update their existing shop
      // instead of registering a duplicate.
      if (existingBusiness) {
        await api.updateBusiness(existingBusiness.id, input);
      } else {
        await api.createBusiness(input);
      }
      router.push("/onboarding/subscription");
    } catch (err) {
      setError(getErrorMessage(err, "Opslaan is mislukt. Controleer je gegevens en probeer het opnieuw."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConsumerLayout>
      <div className="max-w-xl mx-auto my-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-[#121F3E] text-white flex items-center justify-center font-bold text-xl font-rubik mx-auto mb-2">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">
            Complete information about your store
          </h1>
          <p className="text-xs text-[#B7B7B7]">
            Step 1 of 3: Enter your store details to register on LocalSpotter.nl
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">{error}</div>
        )}
        {businessError && (
          <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl text-center">
            {businessError}{" "}
            <button type="button" onClick={reloadBusiness} className="underline">
              Opnieuw proberen
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <ImageUploader variant="logo" label="Store Logo" onChange={(files) => setLogoFile(files[0] ?? null)} />
          </div>
          {logoFile && (
            <p className="text-xs text-[#B7B7B7] text-center">
              Logo uploaden wordt nog niet ondersteund; je kunt je logo later toevoegen.
            </p>
          )}

          <Input
            label="Store Name"
            placeholder="e.g. Bag Shop Horn Center"
            icon={<Store className="w-4 h-4 text-[#B7B7B7]" />}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="State / Province"
              placeholder="Limburg"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
            <Input
              label="City"
              placeholder="Horn"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#111111]">Location</label>
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isLocating}
                className="flex items-center gap-1 text-xs font-bold text-[#FA1EFF] hover:underline disabled:opacity-50"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {isLocating ? "Locating…" : "Use my current location (GPS)"}
              </button>
            </div>
            <Input
              placeholder="Street, house number, postal code, city"
              icon={<MapPin className="w-4 h-4 text-[#54D1CA]" />}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+31 475 123456"
              icon={<Phone className="w-4 h-4 text-[#B7B7B7]" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="KVK Number"
              placeholder="12345678"
              icon={<FileText className="w-4 h-4 text-[#B7B7B7]" />}
              value={kvkNumber}
              onChange={(e) => setKvkNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#111111]">Shop Description</label>
            <textarea
              rows={3}
              className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
              placeholder="Describe your shop and what you offer..."
              value={shopDescription}
              onChange={(e) => setShopDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#111111]">Shop Type / Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={categories.loading || !!categories.error}
              required
              className="w-full h-12 bg-[#EAEAEA] text-[#111111] text-base px-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent disabled:opacity-60"
            >
              <option value="">{categories.loading ? "Categorieën laden..." : "Kies een categorie"}</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.error && (
              <span className="text-xs text-[#ED4C5C] font-medium block">
                Categorieën konden niet worden geladen.{" "}
                <button type="button" onClick={categories.reload} className="underline font-bold">
                  Opnieuw proberen
                </button>
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth className="gap-2 mt-4" isLoading={isSubmitting} disabled={businessLoading}>
            NEXT <ArrowRight className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </ConsumerLayout>
  );
}
