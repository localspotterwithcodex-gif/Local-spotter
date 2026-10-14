"use client";

import React, { useState } from "react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api, type BusinessCategory } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import type { TranslationKey } from "@/i18n/dictionaries";
import type { Business, BusinessHours } from "@/types/business";
import { Store, Clock, MapPin, Bell, Save, CheckCircle2, AlertCircle } from "lucide-react";

const DAY_ORDER: BusinessHours["day"][] = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

const DAY_KEYS: Record<BusinessHours["day"], TranslationKey> = {
  Maandag: "ownerx.day.Maandag",
  Dinsdag: "ownerx.day.Dinsdag",
  Woensdag: "ownerx.day.Woensdag",
  Donderdag: "ownerx.day.Donderdag",
  Vrijdag: "ownerx.day.Vrijdag",
  Zaterdag: "ownerx.day.Zaterdag",
  Zondag: "ownerx.day.Zondag",
};

interface DayRow {
  day: BusinessHours["day"];
  open: string;
  close: string;
  isClosed: boolean;
}

function initialHours(business: Business): DayRow[] {
  return DAY_ORDER.map((day) => {
    const saved = business.hours?.find((h) => h.day === day);
    return {
      day,
      open: saved?.openTime ?? "",
      close: saved?.closeTime ?? "",
      isClosed: saved?.isClosed ?? false,
    };
  });
}

function SettingsForm({ business, categories }: { business: Business; categories: BusinessCategory[] }) {
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [activeTab, setActiveTab] = useState<"profile" | "hours" | "notifications">("profile");
  const [storeName, setStoreName] = useState(business.name);
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.name === business.category)?.id ?? "");
  const [description, setDescription] = useState(business.description);
  const [phone, setPhone] = useState(business.phone);
  const [kvk, setKvk] = useState(business.kvkNumber);
  const [street, setStreet] = useState(business.location.street);
  const [city, setCity] = useState(business.location.city);
  const [province, setProvince] = useState(business.location.province);
  const hasGps = business.location.lat !== 0 || business.location.lng !== 0;
  const [lat, setLat] = useState(hasGps ? String(business.location.lat) : "");
  const [lng, setLng] = useState(hasGps ? String(business.location.lng) : "");

  // Opening hours state
  const [hours, setHours] = useState<DayRow[]>(() => initialHours(business));
  const [hoursDirty, setHoursDirty] = useState(false);
  const updateHour = (idx: number, patch: Partial<DayRow>) => {
    setHours((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setHoursDirty(true);
  };

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaved(false);

    const latNum = lat.trim() === "" ? undefined : Number(lat.replace(",", "."));
    const lngNum = lng.trim() === "" ? undefined : Number(lng.replace(",", "."));
    if ((latNum !== undefined && Number.isNaN(latNum)) || (lngNum !== undefined && Number.isNaN(lngNum))) {
      setError(t("ownerx.settings.errorLatLng"));
      return;
    }
    if (hoursDirty && hours.some((h) => !h.isClosed && (!h.open || !h.close))) {
      setError(t("ownerx.settings.errorHours"));
      return;
    }

    setIsLoading(true);
    try {
      await api.updateBusiness(business.id, {
        name: storeName.trim(),
        description,
        phone,
        kvkNumber: kvk,
        categoryId: categoryId || undefined,
        address: street,
        city,
        state: province,
        latitude: latNum,
        longitude: lngNum,
      });
      if (hoursDirty) {
        await api.updateBusinessHours(
          business.id,
          hours.map((h) => ({ day: h.day, openTime: h.open, closeTime: h.close, isClosed: h.isClosed }))
        );
        setHoursDirty(false);
      }
      setIsSaved(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">
              {t("ownerx.settings.title")}
            </h1>
            <p className="text-xs text-[#B7B7B7]">
              {t("ownerx.settings.subtitle")}
            </p>
          </div>

          {isSaved && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#CBF5D5] text-[#3B9B52] rounded-2xl text-xs font-bold font-manrope animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {t("ownerx.settings.savedBanner")}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

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
            <Store className="w-4 h-4 text-[#FA1EFF]" /> {t("ownerx.settings.tabProfile")}
          </button>
          <button
            onClick={() => setActiveTab("hours")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "hours"
                ? "bg-white text-[#111111] shadow-xs"
                : "text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Clock className="w-4 h-4 text-[#54D1CA]" /> {t("ownerx.settings.tabHours")}
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "notifications"
                ? "bg-white text-[#111111] shadow-xs"
                : "text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Bell className="w-4 h-4 text-[#790166]" /> {t("ownerx.settings.tabNotifications")}
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-xs space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FA1EFF]" /> {t("ownerx.settings.shopInfo")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t("ownerx.settings.shopName")}
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111] block">{t("ownerx.settings.category")}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-11 bg-[#EAEAEA] rounded-xl text-xs font-bold px-3 border-none focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                  >
                    <option value="">{t("ownerx.settings.noCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#111111] block">{t("ownerx.settings.shopDescription")}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-[#EAEAEA] rounded-2xl text-xs font-bold text-[#111111] border-none focus:outline-none focus:ring-2 focus:ring-[#FA1EFF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t("ownerx.settings.phone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <Input
                  label={t("ownerx.settings.kvk")}
                  value={kvk}
                  onChange={(e) => setKvk(e.target.value)}
                  required
                />
              </div>

              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pt-2 pb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#54D1CA]" /> {t("ownerx.settings.locationGps")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label={t("ownerx.settings.street")}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label={t("ownerx.settings.city")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label={t("ownerx.settings.province")}
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
                <Input
                  label={t("ownerx.settings.lat")}
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <Input
                  label={t("ownerx.settings.lng")}
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-[#111111] border-b border-[#EAEAEA] pb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#54D1CA]" /> {t("ownerx.settings.hoursPerDay")}
              </h2>

              <div className="space-y-3">
                {hours.map((item, idx) => (
                  <div
                    key={item.day}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] gap-3"
                  >
                    <span className="text-xs font-bold text-[#111111] w-28">{t(DAY_KEYS[item.day])}</span>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#111111] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isClosed}
                          onChange={(e) => updateHour(idx, { isClosed: e.target.checked })}
                          className="rounded text-[#FA1EFF] focus:ring-[#FA1EFF]"
                        />
                        {t("ownerx.settings.closed")}
                      </label>
                    </div>

                    {!item.isClosed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={item.open}
                          onChange={(e) => updateHour(idx, { open: e.target.value })}
                          className="px-2 py-1 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold"
                        />
                        <span className="text-xs text-[#B7B7B7]">{t("ownerx.settings.until")}</span>
                        <input
                          type="time"
                          value={item.close}
                          onChange={(e) => updateHour(idx, { close: e.target.value })}
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
                <Bell className="w-5 h-5 text-[#790166]" /> {t("ownerx.settings.notificationsHeading")}
              </h2>

              <div className="space-y-4">
                {[
                  { title: t("ownerx.settings.notifOrdersTitle"), text: t("ownerx.settings.notifOrdersText") },
                  { title: t("ownerx.settings.notifReviewsTitle"), text: t("ownerx.settings.notifReviewsText") },
                  { title: t("ownerx.settings.notifTipsTitle"), text: t("ownerx.settings.notifTipsText") },
                ].map((item) => (
                  <label key={item.title} className="flex items-start gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] opacity-60">
                    <input type="checkbox" disabled className="mt-1 rounded text-[#FA1EFF] focus:ring-[#FA1EFF]" />
                    <div>
                      <span className="block text-xs font-bold text-[#111111]">{item.title}</span>
                      <span className="block text-[11px] text-[#B7B7B7]">{item.text}</span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[#B7B7B7]">
                {t("ownerx.settings.notifUnsupported")}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#EAEAEA] flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="gap-2 px-8 h-12"
            >
              <Save className="w-4 h-4" /> {t("ownerx.settings.saveChanges")}
            </Button>
          </div>
        </form>
      </div>
  );
}

export default function OwnerSettingsPage() {
  const { t } = useLocale();
  const { business, loading, error, reload } = useMyBusiness();
  const categories = useApiResource("business-categories", () => api.getBusinessCategories());

  let content: React.ReactNode;
  if (loading || categories.loading) {
    content = <LoadingState label={t("ownerx.settings.loading")} />;
  } else if (error ?? categories.error) {
    content = <ErrorState message={error ?? categories.error} onRetry={error ? reload : categories.reload} />;
  } else if (!business) {
    content = <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forSettings")} />;
  } else {
    content = <SettingsForm key={business.id} business={business} categories={categories.data ?? []} />;
  }

  return <OwnerLayout>{content}</OwnerLayout>;
}
