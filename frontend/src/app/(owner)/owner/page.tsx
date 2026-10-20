"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Star, Users, Package, X, ImageOff } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { ShareButton } from "@/components/ui/ShareButton";
import { useMyBusiness } from "@/features/business/useMyBusiness";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;

  const products = useApiResource(businessId && `owner-products:${businessId}`, () => api.getBusinessProducts(businessId!));
  const subRes = useApiResource(businessId && `owner-subscription:${businessId}`, () => api.getBusinessSubscription(businessId!));
  const [fabOpen, setFabOpen] = useState(false);

  if (businessLoading) {
    return (
      <OwnerLayout>
        <LoadingState label={t("ownerx.dash.loading")} />
      </OwnerLayout>
    );
  }

  if (businessError) {
    return (
      <OwnerLayout>
        <ErrorState message={businessError} onRetry={reloadBusiness} />
      </OwnerLayout>
    );
  }

  if (!business) {
    return (
      <OwnerLayout>
        <EmptyState
          title={t("ownerx.noShop.title")}
          description={t("ownerx.noShop.dashboardDesc")}
          actionLabel={t("ownerx.noShop.createAction")}
          onAction={() => router.push("/onboarding/business")}
        />
      </OwnerLayout>
    );
  }

  const productList = products.data ?? [];

  const hasBanner = Boolean(business.heroImageUrl);
  const stats: Array<{ icon: React.ReactNode; value: string; label: string }> = [
    { icon: <Star className="w-5 h-5 fill-[#D4B011] text-[#D4B011]" />, value: `${business.rating} (${business.reviewCount})`, label: t("manage.shop.rating") },
    { icon: <Users className="w-5 h-5 text-[#FA1EFF]" />, value: String(business.followerCount), label: t("manage.shop.followers") },
    { icon: <Package className="w-5 h-5 text-[#FA1EFF]" />, value: String(productList.length), label: t("manage.shop.productsStat") },
  ];
  const addLinks = [
    { href: "/owner/products/new", label: t("owner.addProduct") },
    { href: "/owner/workshops/new", label: t("ownerx.dash.workshopBtn") },
  ];

  return (
    <OwnerLayout>
      <div className="max-w-[640px] mx-auto">
        {/* Visibility: customers only see shops that are approved AND have an active plan */}
        {!subRes.loading && !subRes.error && (
          business.status === "ACTIVE" && subRes.data?.status === "ACTIVE" ? (
            <div className="mb-3 rounded-2xl bg-[#E8F8F7] border border-[#54D1CA] p-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-[#121F3E]">{t("ownerx.visible.live")}</span>
              <Link href={`/businesses/${business.id}`} className="font-bold text-[#FA1EFF] whitespace-nowrap">
                {t("ownerx.visible.view")}
              </Link>
            </div>
          ) : (
            <div className="mb-3 rounded-2xl bg-[#FFF6DB] border border-[#D4B011] p-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-[#121F3E]">
                {business.status !== "ACTIVE" ? t("ownerx.visible.pendingApproval") : t("ownerx.visible.needsPlan")}
              </span>
              {business.status === "ACTIVE" && (
                <Link href="/owner/subscription" className="font-bold text-[#FA1EFF] whitespace-nowrap">
                  {t("ownerx.visible.activate")}
                </Link>
              )}
            </div>
          )
        )}
        {/* Banner with stats (Figma "Retailers" / shop profile) */}
        <div className="relative h-60 -mx-4 sm:mx-0 bg-[#FAE2F0] sm:rounded-3xl overflow-hidden">
          {hasBanner ? (
            <Image src={business.heroImageUrl as string} alt={business.name} fill className="object-cover" sizes="640px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#B7B7B7]" aria-hidden="true">
              <ImageOff className="w-10 h-10" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <ShareButton href={`/businesses/${business.id}`} title={business.name} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-white/70 backdrop-blur-sm pb-12 pt-3 grid grid-cols-3 divide-x divide-[#B7B7B7]/60">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                {s.icon}
                <span className="text-[11px] font-bold text-[#111111]">{s.value}</span>
                <span className="text-[10px] text-[#555555]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info card overlapping the banner */}
        <div className="relative -mt-10 mx-4 sm:mx-6 bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-start gap-3">
            <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden bg-[#FAE2F0] flex items-center justify-center text-[#FA1EFF] font-bold font-rubik">
              {business.logoUrl ? (
                <Image src={business.logoUrl} alt={business.name} fill className="object-cover" sizes="56px" />
              ) : (
                business.name.charAt(0).toUpperCase()
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#FA1EFF] border-2 border-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-[#121F3E] truncate">{business.name}</h1>
              <p className="text-[11px] text-[#B7B7B7]">{business.shopType || business.category}</p>
              <p className="text-[11px] text-[#555555] line-clamp-2">{business.description}</p>
            </div>
            <Link
              href="/owner/settings/store"
              aria-label={t("manage.shop.editStore")}
              className="w-9 h-9 shrink-0 rounded-full border border-[#FA1EFF] text-[#FA1EFF] flex items-center justify-center hover:bg-[#FAE2F0]"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
            <dt className="font-bold text-[#121F3E]">{t("manage.shop.address")}</dt>
            <dd className="text-[#555555]">
              {[business.location.street, business.location.city].filter(Boolean).join(", ")}
            </dd>
            <dt className="font-bold text-[#121F3E]">{t("manage.shop.kvk")}</dt>
            <dd className="text-[#555555]">{business.kvkNumber}</dd>
          </dl>
        </div>

      </div>

      {/* Floating "+" (Figma): add a product or a workshop */}
      <div className="fixed right-5 bottom-28 md:bottom-8 z-40 flex flex-col items-end gap-2">
        {fabOpen &&
          addLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-full bg-white text-xs font-bold text-[#790166] shadow-md hover:bg-[#FAE2F0]"
            >
              {l.label}
            </Link>
          ))}
        <button
          type="button"
          onClick={() => setFabOpen((v) => !v)}
          aria-label={t("manage.shop.add")}
          aria-expanded={fabOpen}
          className="w-12 h-12 rounded-full bg-[#EA89B1] text-white flex items-center justify-center shadow-lg hover:bg-[#D977A0]"
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </OwnerLayout>
  );
}
