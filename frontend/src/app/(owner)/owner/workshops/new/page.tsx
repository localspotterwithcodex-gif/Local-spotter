"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Users, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function AddWorkshopPage() {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!business) {
      setError(t("ownerx.error.noShop"));
      return;
    }
    const priceNum = parseFloat(price);
    const capacityNum = parseInt(capacity, 10);
    if (Number.isNaN(priceNum) || Number.isNaN(capacityNum)) {
      setError(t("ownerx.error.requiredFields"));
      return;
    }
    if (finishTime <= startTime) {
      setError(t("ownerx.workshopNew.errorEndTime"));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createWorkshop({
        businessId: business.id,
        title: title.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        capacity: capacityNum,
        location: location.trim() || undefined,
        date,
        startTime,
        finishTime,
        imageUrl: imageUrl.trim() || undefined,
      });
      router.push("/owner");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (businessLoading || businessError || !business) {
    return (
      <OwnerLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
            <ArrowLeft className="w-4 h-4" />
            {t("ownerx.backToDashboard")}
          </Link>
          {businessLoading ? (
            <LoadingState label={t("ownerx.loadingShop")} />
          ) : businessError ? (
            <ErrorState message={businessError} onRetry={reloadBusiness} />
          ) : (
            <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forWorkshops")} />
          )}
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.workshopNew.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("ownerx.workshopNew.subtitle")}</p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Workshop Image Preview */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#111111]">{t("ownerx.workshopNew.imageLabel")}</label>
              <div className="relative h-44 rounded-2xl overflow-hidden bg-[#790166]/10 border border-[#EAEAEA]">
                {/^https?:\/\//.test(imageUrl.trim()) && (
                  <Image src={imageUrl.trim()} alt={t("ownerx.workshopNew.imageAlt")} fill unoptimized className="object-cover" />
                )}
              </div>
              <Input
                placeholder={t("ownerx.workshopNew.imagePlaceholder")}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                helperText={t("ownerx.workshopNew.imageHelp")}
              />
            </div>

            {/* Workshop Name */}
            <Input
              label={t("ownerx.workshopNew.nameLabel")}
              placeholder={t("ownerx.workshopNew.namePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Price & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("ownerx.workshopNew.priceLabel")}
                type="number"
                step="0.01"
                placeholder="49.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label={t("ownerx.workshopNew.capacityLabel")}
                type="number"
                placeholder="8"
                icon={<Users className="w-4 h-4 text-[#790166]" />}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>

            {/* Location */}
            <Input
              label={t("ownerx.workshopNew.locationLabel")}
              placeholder={t("ownerx.workshopNew.locationPlaceholder")}
              icon={<MapPin className="w-4 h-4 text-[#54D1CA]" />}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={t("ownerx.workshopNew.dateLabel")}
                type="date"
                icon={<Calendar className="w-4 h-4 text-[#FA1EFF]" />}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label={t("ownerx.workshopNew.startLabel")}
                type="time"
                icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                label={t("ownerx.workshopNew.finishLabel")}
                type="time"
                icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                value={finishTime}
                onChange={(e) => setFinishTime(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#111111]">{t("ownerx.workshopNew.descLabel")}</label>
              <textarea
                rows={4}
                className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                placeholder={t("ownerx.workshopNew.descPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Link href="/owner" className="flex-1">
                <Button variant="ghost" size="lg" fullWidth type="button">
                  {t("ownerx.workshopNew.cancel")}
                </Button>
              </Link>
              <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting}>
                {t("ownerx.workshopNew.create")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
