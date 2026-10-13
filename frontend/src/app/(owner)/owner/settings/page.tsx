"use client";

import React, { useState } from "react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MOCK_BUSINESSES } from "@/data/mock/businesses";
import { Store, Clock, MapPin, Bell, Save, CheckCircle2, ShieldCheck } from "lucide-react";

export default function OwnerSettingsPage() {
  const initialBusiness = MOCK_BUSINESSES[0];

  const [activeTab, setActiveTab] = useState<"profile" | "hours" | "notifications">("profile");
  const [storeName, setStoreName] = useState(initialBusiness.name);
  const [category, setCategory] = useState(initialBusiness.category);
  const [description, setDescription] = useState(initialBusiness.description);
  const [phone, setPhone] = useState(initialBusiness.phone || "020-1234567");
  const [kvk, setKvk] = useState(initialBusiness.kvkNumber || "87654321");
  const [street, setStreet] = useState(initialBusiness.location?.street || "Keizersgracht 142");
  const [city, setCity] = useState(initialBusiness.location?.city || "Amsterdam");
  const [province, setProvince] = useState(initialBusiness.location?.province || "Noord-Holland");
  const [lat, setLat] = useState(initialBusiness.location?.lat?.toString() || "52.3702");
  const [lng, setLng] = useState(initialBusiness.location?.lng?.toString() || "4.8951");

  // Opening hours state
  const [hours, setHours] = useState([
    { day: "Maandag", open: "09:00", close: "18:00", isClosed: false },
    { day: "Dinsdag", open: "09:00", close: "18:00", isClosed: false },
    { day: "Woensdag", open: "09:00", close: "18:00", isClosed: false },
    { day: "Donderdag", open: "09:00", close: "20:00", isClosed: false },
    { day: "Vrijdag", open: "09:00", close: "18:00", isClosed: false },
    { day: "Zaterdag", open: "10:00", close: "17:00", isClosed: false },
    { day: "Zondag", open: "12:00", close: "17:00", isClosed: true },
  ]);

  // Notifications
  const [emailOrders, setEmailOrders] = useState(true);
  const [emailReviews, setEmailReviews] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 600);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">
              Winkel Instellingen
            </h1>
            <p className="text-xs text-[#B7B7B7]">
              Beheer je winkelprofiel, openingstijden, locatie en meldingsvoorkeuren.
            </p>
          </div>

          {isSaved && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#CBF5D5] text-[#3B9B52] rounded-2xl text-xs font-bold font-manrope animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Instellingen opgeslagen!
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#F4F5FA] p-1.5 rounded-2xl max-w-md border border-[#EAEAEA]">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "profile"
                ? "bg-white text-[#111111] shadow-xs"
                : "text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Store className="w-4 h-4 text-[#FA1EFF]" /> Profiel & Adres
          </button>
          <button
            onClick={() => setActiveTab("hours")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "hours"
                ? "bg-white text-[#111111] shadow-xs"
                : "text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Clock className="w-4 h-4 text-[#54D1CA]" /> Openingstijden
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "notifications"
                ? "bg-white text-[#111111] shadow-xs"
                : "text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Bell className="w-4 h-4 text-[#790166]" /> Meldingen
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-xs space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FA1EFF]" /> Winkel Informatie
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Winkelnaam"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111] block">Categorie</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 bg-[#EAEAEA] rounded-xl text-xs font-bold px-3 border-none focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                  >
                    <option value="Fashion">Fashion & Kleding</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Local Products">Ambachtelijk & Lokaal</option>
                    <option value="Beauty">Beauty & Verzorging</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] block">Winkel Omschrijving</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-[#EAEAEA] rounded-2xl text-xs font-bold text-[#111111] border-none focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telefoonnummer"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input
                  label="KVK-nummer"
                  value={kvk}
                  onChange={(e) => setKvk(e.target.value)}
                  required
                />
              </div>

              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pt-2 pb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#54D1CA]" /> Locatie & GPS Coördinaten
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Straat & Huisnummer"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Stad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Provincie"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
                <Input
                  label="Breedtegraad (Lat)"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <Input
                  label="Lengtegraad (Lng)"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#54D1CA]" /> Openingstijden Per Dag
              </h2>

              <div className="space-y-3">
                {hours.map((item, idx) => (
                  <div
                    key={item.day}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] gap-3"
                  >
                    <span className="text-xs font-bold text-[#111111] w-28">{item.day}</span>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#111111] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isClosed}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[idx].isClosed = e.target.checked;
                            setHours(newHours);
                          }}
                          className="rounded text-[#FA1EFF] focus:ring-[#FA1EFF]"
                        />
                        Gesloten
                      </label>
                    </div>

                    {!item.isClosed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={item.open}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[idx].open = e.target.value;
                            setHours(newHours);
                          }}
                          className="px-2 py-1 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold"
                        />
                        <span className="text-xs text-[#B7B7B7]">tot</span>
                        <input
                          type="time"
                          value={item.close}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[idx].close = e.target.value;
                            setHours(newHours);
                          }}
                          className="px-2 py-1 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#790166]" /> E-mail & Systeem Meldingen
              </h2>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailOrders}
                    onChange={(e) => setEmailOrders(e.target.checked)}
                    className="mt-1 rounded text-[#FA1EFF] focus:ring-[#FA1EFF]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-[#111111]">Nieuwe Bestellingen</span>
                    <span className="block text-[11px] text-[#B7B7B7]">
                      Ontvang direct een e-mailbericht wanneer een klant een bestelling plaatst.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailReviews}
                    onChange={(e) => setEmailReviews(e.target.checked)}
                    className="mt-1 rounded text-[#FA1EFF] focus:ring-[#FA1EFF]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-[#111111]">Nieuwe Beoordelingen</span>
                    <span className="block text-[11px] text-[#B7B7B7]">
                      Melding wanneer een klant een review of sterrenscore achterlaat.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailMarketing}
                    onChange={(e) => setEmailMarketing(e.target.checked)}
                    className="mt-1 rounded text-[#FA1EFF] focus:ring-[#FA1EFF]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-[#111111]">LocalSpotter Tips & Updates</span>
                    <span className="block text-[11px] text-[#B7B7B7]">
                      Maandelijkse tips om je lokale zichtbaarheid en verkopen te verhogen.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#EAEAEA] flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="gap-2 px-8 h-12"
            >
              <Save className="w-4 h-4" /> WIJZIGINGEN OPSLAAN
            </Button>
          </div>
        </form>
      </div>
    </OwnerLayout>
  );
}
