"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Navigation, Store, ArrowLeft, CheckCircle, Compass } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { Shoproute, RouteStop } from "@/types/shoproute";

export default function ShoprouteDetailPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);

  const [route, setRoute] = useState<Shoproute | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoute() {
      setIsLoading(true);
      const data = await api.getShoprouteById(routeId);
      setRoute(data);
      if (data && data.stops.length > 0) {
        setSelectedStop(data.stops[0]);
      }
      setIsLoading(false);
    }
    loadRoute();
  }, [routeId]);

  const handleStartRoute = () => {
    setIsNavigating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback location if permission denied
          setUserLocation({ lat: 52.0116, lng: 4.3571 });
        }
      );
    } else {
      setUserLocation({ lat: 52.0116, lng: 4.3571 });
    }
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label="Shoproute laden..." />
      </ConsumerLayout>
    );
  }

  if (!route) {
    return (
      <ConsumerLayout>
        <ErrorState title="Shoproute niet gevonden" message="Deze route bestaat niet meer." />
      </ConsumerLayout>
    );
  }

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link href="/shoproutes" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar alle shoproutes
        </Link>

        {/* Route Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#EAEAEA]">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#54D1CA] bg-[#54D1CA]/10 px-3 py-1 rounded-full mb-1">
              <MapPin className="w-3.5 h-3.5" />
              {route.cityName}
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">{route.title}</h1>
            <p className="text-xs text-[#555555] mt-1">{route.description}</p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleStartRoute}
            className="gap-2 bg-[#54D1CA] hover:bg-[#43B8B1] text-white shrink-0"
          >
            <Navigation className="w-5 h-5" />
            {isNavigating ? "Route Actief" : "Start de shoproute"}
          </Button>
        </div>

        {/* MAP & STOPS CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MAP CANVAS PANEL (2 cols on desktop) */}
          <div className="md:col-span-2 bg-white rounded-3xl p-4 border border-[#EAEAEA] flex flex-col justify-between min-h-[400px] relative overflow-hidden">
            {/* Interactive Map Visual Placeholder */}
            <div className="w-full h-full bg-[#54D1CA]/10 rounded-2xl relative flex items-center justify-center p-6 border border-[#54D1CA]/20">
              {/* User Location Indicator from Figma ("You are here") */}
              {isNavigating && (
                <div className="absolute top-8 left-12 bg-[#121F3E] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse z-20">
                  <Compass className="w-4 h-4 text-[#54D1CA]" />
                  You are here
                </div>
              )}

              {/* Map Stops Markers */}
              <div className="w-full flex justify-around items-center z-10">
                {route.stops.map((stop) => {
                  const isSelected = selectedStop?.id === stop.id;
                  return (
                    <button
                      key={stop.id}
                      onClick={() => setSelectedStop(stop)}
                      className={`flex flex-col items-center gap-1 transition-all ${
                        isSelected ? "scale-125 z-30" : "opacity-85 hover:opacity-100"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                          isSelected
                            ? "bg-[#FA1EFF] text-white ring-4 ring-[#FAE2F0]"
                            : "bg-[#54D1CA] text-white"
                        }`}
                      >
                        {stop.sequenceOrder}
                      </div>
                      <span className="text-[11px] font-bold text-[#111111] bg-white/90 px-2 py-0.5 rounded-md shadow-xs max-w-[100px] truncate">
                        {stop.businessName}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Map background grid effect */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#54D1CA_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>

            {/* Selected Stop Card Overlay */}
            {selectedStop && (
              <div className="mt-4 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#54D1CA] uppercase">
                    Stop #{selectedStop.sequenceOrder}
                  </span>
                  <h4 className="text-sm font-bold text-[#111111]">{selectedStop.businessName}</h4>
                  <p className="text-xs text-[#B7B7B7]">{selectedStop.address}</p>
                </div>
                <Link
                  href={`/businesses/${selectedStop.businessId}`}
                  className="px-3 py-1.5 rounded-xl bg-[#FA1EFF] text-white text-xs font-bold hover:bg-[#E000EC] transition-colors"
                >
                  Bekijk Winkel
                </Link>
              </div>
            )}
          </div>

          {/* ROUTE STOPS LIST PANEL */}
          <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] space-y-4">
            <h3 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
              <Store className="w-4 h-4 text-[#FA1EFF]" />
              Deelnemende Winkels ({route.stops.length})
            </h3>

            <div className="space-y-2.5">
              {route.stops.map((stop) => {
                const isSelected = selectedStop?.id === stop.id;
                return (
                  <div
                    key={stop.id}
                    onClick={() => setSelectedStop(stop)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? "bg-[#FAE2F0]/40 border-[#FA1EFF] shadow-xs"
                        : "bg-[#F9F9F9] border-[#EAEAEA] hover:border-[#54D1CA]"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#54D1CA] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {stop.sequenceOrder}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#111111] truncate">{stop.businessName}</h4>
                      <p className="text-[11px] text-[#B7B7B7] truncate">{stop.address}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
