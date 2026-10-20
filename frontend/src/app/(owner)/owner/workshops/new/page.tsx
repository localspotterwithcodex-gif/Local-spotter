"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Users, AlertCircle, Plus, Trash2 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerImageUploader } from "@/components/ui/ServerImageUploader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api, type UploadedImage } from "@/lib/api";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useOwnerAccess } from "@/features/business/useOwnerAccess";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { validationDetail } from "@/lib/errors";

export default function AddWorkshopPage() {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();

  const access = useOwnerAccess(business?.id ?? null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  type Row = { date: string; startTime: string; finishTime: string; capacity: string };
  const emptyRow: Row = { date: "", startTime: "", finishTime: "", capacity: "" };
  const [rows, setRows] = useState<Row[]>([emptyRow]);
  const [deadlineHours, setDeadlineHours] = useState("48");
  const [refundPct, setRefundPct] = useState("100");
  const [minAge, setMinAge] = useState("");
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

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
    for (const r of rows) {
      if (!r.date || !r.startTime || !r.finishTime) {
        setError(t("ownerx.error.requiredFields"));
        return;
      }
      if (r.finishTime <= r.startTime) {
        setError(t("ownerx.workshopNew.errorEndTime"));
        return;
      }
      if (new Date(`${r.date}T${r.startTime}`).getTime() <= Date.now()) {
        setError(t("ownerx.workshopNew.errorPast"));
        return;
      }
    }
    const deadlineNum = parseInt(deadlineHours, 10);
    const refundNum = parseInt(refundPct, 10);
    const minAgeNum = minAge ? parseInt(minAge, 10) : undefined;
    if (Number.isNaN(deadlineNum) || deadlineNum < 0 || deadlineNum > 720 || Number.isNaN(refundNum) || refundNum < 0 || refundNum > 100) {
      setError(t("ownerx.workshopNew.errorPolicy"));
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
        sessions: rows.map((r) => ({
          date: r.date,
          startTime: r.startTime,
          finishTime: r.finishTime,
          capacity: r.capacity ? parseInt(r.capacity, 10) : undefined,
        })),
        cancellationDeadlineHours: deadlineNum,
        refundPercentage: refundNum,
        minAge: minAgeNum,
        imageAssetId: images[0]?.id,
        imageUrl: images[0]?.url,
      });
      router.push("/owner/workshops");
    } catch (err) {
      const detail = validationDetail(err);
      setError(detail ? `${errMsg(err)} (${detail})` : errMsg(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (businessLoading || businessError || !business) {
    return (
      <OwnerLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
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

  if (!access.loading && !access.can("workshops")) {
    return (
      <OwnerLayout>
        <div className="max-w-2xl mx-auto space-y-3">
          <Link href="/owner/workshops" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
            <ArrowLeft className="w-4 h-4" />
            {t("owner.myWorkshops")}
          </Link>
          <div className="rounded-2xl bg-[#FFF6DB] border border-[#D4B011] p-4 text-sm text-[#121F3E] space-y-2">
            <p>{t("ownerx.workshops.locked")}</p>
            <Link href="/owner/subscription" className="font-bold text-[#FA1EFF]">{t("ownerx.routes.upgrade")}</Link>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
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
            <ServerImageUploader
              label={t("ownerx.workshopNew.imageLabel")}
              value={images}
              onChange={setImages}
              max={1}
              onBusyChange={setUploading}
            />

            <p className="text-xs text-[#790166] bg-[#FAE2F0] rounded-xl px-3 py-2">{t("manage.product.translateHint")}</p>

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

            {/* Sessions */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-[#111111]">{t("ownerx.workshopNew.sessionsTitle")}</legend>
              {rows.map((r, i) => (
                <div key={i} className="rounded-2xl border border-[#EAEAEA] p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input
                      label={t("ownerx.workshopNew.dateLabel")}
                      type="date"
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}
                      icon={<Calendar className="w-4 h-4 text-[#FA1EFF]" />}
                      value={r.date}
                      onChange={(e) => setRow(i, { date: e.target.value })}
                      required
                    />
                    <Input
                      label={t("ownerx.workshopNew.startLabel")}
                      type="time"
                      icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                      value={r.startTime}
                      onChange={(e) => setRow(i, { startTime: e.target.value })}
                      required
                    />
                    <Input
                      label={t("ownerx.workshopNew.finishLabel")}
                      type="time"
                      icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                      value={r.finishTime}
                      onChange={(e) => setRow(i, { finishTime: e.target.value })}
                      required
                    />
                    <Input
                      label={t("ownerx.workshopNew.sessionSeats")}
                      type="number"
                      min={1}
                      placeholder={capacity || "8"}
                      value={r.capacity}
                      onChange={(e) => setRow(i, { capacity: e.target.value })}
                    />
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))}
                      className="flex items-center gap-1 text-xs font-bold text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t("ownerx.workshopNew.removeSession")}
                    </button>
                  )}
                </div>
              ))}
              {rows.length < 30 && (
                <button
                  type="button"
                  onClick={() => setRows((x) => [...x, { ...emptyRow }])}
                  className="flex items-center gap-1 text-xs font-bold text-[#FA1EFF]"
                >
                  <Plus className="w-4 h-4" /> {t("ownerx.workshopNew.addSession")}
                </button>
              )}
            </fieldset>

            {/* Policy */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-[#111111]">{t("ownerx.workshopNew.policyTitle")}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label={t("ownerx.workshopNew.deadlineLabel")}
                  type="number"
                  min={0}
                  max={720}
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                />
                <Input
                  label={t("ownerx.workshopNew.refundLabel")}
                  type="number"
                  min={0}
                  max={100}
                  value={refundPct}
                  onChange={(e) => setRefundPct(e.target.value)}
                />
                <Input
                  label={t("ownerx.workshopNew.minAgeLabel")}
                  type="number"
                  min={0}
                  max={99}
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-[#B7B7B7]">{t("ownerx.workshopNew.policyHint")}</p>
            </fieldset>

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
              <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting} disabled={uploading}>
                {t("ownerx.workshopNew.create")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
