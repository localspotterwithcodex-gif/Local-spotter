"use client";

import { PanoramaViewer } from "@/components/PanoramaViewer";
import React, { useState, use } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Star, Heart, MapPin, Phone, FileText, ShoppingBag, Calendar, Lock, Check, MessageCircle } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ProductCard } from "@/components/cards/ProductCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";
import { useAuth } from "@/features/auth/AuthContext";

export default function BusinessDetailPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = use(params);
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { role, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const businessRes = useApiResource(`business:${businessId}`, () => api.getBusinessById(businessId));
  const business = businessRes.data ?? null;
  const resolvedId = business?.id ?? null;
  const productsRes = useApiResource(resolvedId ? `business-products:${resolvedId}` : null, () =>
    api.getProducts({ businessId: resolvedId as string })
  );
  const workshopsRes = useApiResource(resolvedId ? `business-workshops:${resolvedId}` : null, () =>
    api.getWorkshops({ businessId: resolvedId as string })
  );
  const reviewsRes = useApiResource(resolvedId ? `business-reviews:${resolvedId}` : null, () =>
    api.getBusinessReviews(resolvedId as string)
  );
  const isConsumer = isAuthenticated && role === "CONSUMER";
  const followRes = useApiResource(resolvedId && isConsumer ? `follow-status:${resolvedId}` : null, () =>
    api.getFollowStatus(resolvedId as string)
  );
  const products = productsRes.data ?? [];
  const workshops = workshopsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const [activeTab, setActiveTab] = useState<"products" | "workshops" | "map" | "reviews">("products");
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  const serverFollowing = followRes.data ?? false;
  const isFollowing = followOverride ?? serverFollowing;
  const followerCount = (business?.followerCount ?? 0) + (isFollowing ? 1 : 0) - (serverFollowing ? 1 : 0);
  const isLoading = businessRes.loading;

  const [chatBusy, setChatBusy] = useState(false);
  const openChat = async () => {
    if (!business) return;
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setChatBusy(true);
    setFollowError(null);
    try {
      const { id } = await api.startConversation(business.id);
      router.push(`/chat/${id}`);
    } catch {
      setFollowError(t("manage.chat.startFailed"));
      setChatBusy(false);
    }
  };

  const toggleFollow = async () => {
    if (!business) return;
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    setFollowBusy(true);
    setFollowError(null);
    try {
      const next = isFollowing ? await api.unfollowBusiness(business.id) : await api.followBusiness(business.id);
      setFollowOverride(next);
    } catch (err) {
      setFollowError(errMsg(err));
    } finally {
      setFollowBusy(false);
    }
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label={t("shops.detail.loading")} />
      </ConsumerLayout>
    );
  }

  if (businessRes.error) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("shops.detail.unavailable")} message={businessRes.error} onRetry={businessRes.reload} />
      </ConsumerLayout>
    );
  }

  if (!business) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("shops.detail.notFound")} message={t("shops.detail.notFoundDesc")} />
      </ConsumerLayout>
    );
  }

  const hasShoproutes = business.subscriptionPlan === "shoproutes" || business.subscriptionPlan === "workshop";
  const hasWorkshops = business.subscriptionPlan === "workshop";
  const hasReviews = business.subscriptionPlan === "workshop";

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Hero & Profile Header */}
        <div className="bg-white rounded-3xl overflow-hidden border border-[#EAEAEA] shadow-2xs">
          {/* Cover Image */}
          <div className="relative h-44 md:h-64 w-full bg-[#FAE2F0]">
            {business.heroImageUrl ? (
              <Image src={business.heroImageUrl} alt={business.name} fill className="object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          {/* Business Info Header */}
          <div className="p-4 md:p-6 relative pt-0">
            {/* Logo Avatar overlapping cover */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 md:-mt-16 mb-4 relative z-10">
              <div className="flex items-end gap-4">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-white p-1 border-4 border-white shadow-md">
                  {business.logoUrl ? (
                    <Image src={business.logoUrl} alt={business.name} fill className="object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-full bg-[#FAE2F0] text-[#FA1EFF] font-bold text-3xl flex items-center justify-center rounded-xl">
                      {business.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="pb-1">
                  <span className="text-xs font-bold text-[#FA1EFF] bg-[#FAE2F0] px-2.5 py-1 rounded-full">
                    {business.category}
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111] mt-1">
                    {business.name}
                  </h1>
                </div>
              </div>

              {/* Follow CTA */}
              <div className="flex items-center gap-3">
                {(!isAuthenticated || isConsumer) && (
                  <Button variant="outline" size="md" onClick={openChat} isLoading={chatBusy} className="gap-2">
                    <MessageCircle className="w-4 h-4" /> {t("manage.chat.withShop")}
                  </Button>
                )}
                <Button
                  variant={isFollowing ? "outline" : "primary"}
                  size="md"
                  onClick={toggleFollow}
                  isLoading={followBusy}
                  disabled={isAuthenticated && !isConsumer}
                  className="gap-2"
                >
                  {isFollowing ? (
                    <>
                      <Check className="w-4 h-4" /> {t("shops.detail.following")}
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" /> {t("shops.detail.follow")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {followError && (
              <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
                {followError}
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 py-3 px-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] text-center my-4">
              <div>
                <div className="flex items-center justify-center gap-1 text-sm font-bold text-[#111111]">
                  <Star className="w-4 h-4 fill-[#D4B011] text-[#D4B011]" />
                  {business.rating}
                </div>
                <span className="text-[11px] text-[#B7B7B7]">{t("shops.detail.score")}</span>
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">{business.reviewCount}</span>
                <span className="text-[11px] text-[#B7B7B7]">{t("shops.detail.reviews")}</span>
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">{followerCount}</span>
                <span className="text-[11px] text-[#B7B7B7]">{t("shops.detail.followers")}</span>
              </div>
              <div>
                <span className="block text-sm font-bold text-[#111111]">{products.length}</span>
                <span className="text-[11px] text-[#B7B7B7]">{t("shops.detail.products")}</span>
              </div>
            </div>

            {business.panoramaUrl && (
              <section className="my-4 space-y-2" aria-label={t("panorama.title")}>
                <h2 className="text-sm font-bold font-rubik text-[#111111]">{t("panorama.title")}</h2>
                <PanoramaViewer src={business.panoramaUrl} alt={t("panorama.alt", { name: business.name })} />
              </section>
            )}

            {/* Description & Contact Meta */}
            <div className="space-y-3 text-xs text-[#555555]">
              <p className="text-sm leading-relaxed">{business.description}</p>
              <div className="flex flex-wrap gap-4 pt-2 border-t border-[#F9F9F9] text-xs text-[#111111] font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#54D1CA]" />
                  {business.location.street} {business.location.houseNumber}, {business.location.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#B7B7B7]" />
                  {business.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#B7B7B7]" />
                  {t("shops.detail.kvk", { n: business.kvkNumber })}
                </span>
              </div>
              {[
                [business.websiteUrl, t("ownerx.settings.website")],
                [business.instagramUrl, "Instagram"],
                [business.facebookUrl, "Facebook"],
                [business.tiktokUrl, "TikTok"],
              ].some(([u]) => !!u) && (
                <div className="flex flex-wrap gap-3 pt-2 text-xs font-bold">
                  {([
                    [business.websiteUrl, t("ownerx.settings.website")],
                    [business.instagramUrl, "Instagram"],
                    [business.facebookUrl, "Facebook"],
                    [business.tiktokUrl, "TikTok"],
                  ] as [string | undefined, string][])
                    .filter(([u]) => !!u)
                    .map(([u, label]) => (
                      <a key={label} href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-[#FA1EFF] hover:underline">
                        {label}
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#EAEAEA] gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "products"
                ? "border-[#FA1EFF] text-[#FA1EFF]"
                : "border-transparent text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> {t("shops.detail.tabProducts", { n: products.length })}
          </button>

          <button
            onClick={() => setActiveTab("workshops")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "workshops"
                ? "border-[#FA1EFF] text-[#FA1EFF]"
                : "border-transparent text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Calendar className="w-4 h-4" /> {t("shops.detail.tabWorkshops", { n: workshops.length })}
            {!hasWorkshops && <Lock className="w-3 h-3 text-[#B7B7B7]" />}
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "map"
                ? "border-[#FA1EFF] text-[#FA1EFF]"
                : "border-transparent text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <MapPin className="w-4 h-4" /> {t("shops.detail.tabMap")}
            {!hasShoproutes && <Lock className="w-3 h-3 text-[#B7B7B7]" />}
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "reviews"
                ? "border-[#FA1EFF] text-[#FA1EFF]"
                : "border-transparent text-[#B7B7B7] hover:text-[#111111]"
            }`}
          >
            <Star className="w-4 h-4" /> {t("shops.detail.tabReviews", { n: reviews.length })}
            {!hasReviews && <Lock className="w-3 h-3 text-[#B7B7B7]" />}
          </button>
        </div>

        {/* TAB CONTENTS */}
        {/* 1. Products Tab */}
        {activeTab === "products" && (
          <div>
            {productsRes.loading ? (
              <LoadingState label={t("shops.detail.loadingProducts")} />
            ) : productsRes.error ? (
              <ErrorState message={productsRes.error} onRetry={productsRes.reload} />
            ) : products.length === 0 ? (
              <EmptyState title={t("shops.detail.noProductsTitle")} description={t("shops.detail.noProductsDesc")} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Workshops Tab */}
        {activeTab === "workshops" && (
          <div>
            {!hasWorkshops ? (
              <div className="p-8 text-center bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA]">
                <Lock className="w-8 h-8 text-[#B7B7B7] mx-auto mb-2" />
                <h3 className="text-base font-bold font-rubik text-[#111111]">{t("shops.detail.workshopsOffTitle")}</h3>
                <p className="text-xs text-[#B7B7B7] max-w-sm mx-auto mt-1">
                  {t("shops.detail.workshopsOffDesc")}
                </p>
              </div>
            ) : workshopsRes.loading ? (
              <LoadingState label={t("shops.detail.loadingWorkshops")} />
            ) : workshopsRes.error ? (
              <ErrorState message={workshopsRes.error} onRetry={workshopsRes.reload} />
            ) : workshops.length === 0 ? (
              <EmptyState title={t("shops.detail.noWorkshopsTitle")} description={t("shops.detail.noWorkshopsDesc")} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workshops.map((ws) => (
                  <WorkshopCard key={ws.id} workshop={ws} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Map Tab */}
        {activeTab === "map" && (
          <div>
            {!hasShoproutes ? (
              <div className="p-8 text-center bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA]">
                <Lock className="w-8 h-8 text-[#B7B7B7] mx-auto mb-2" />
                <h3 className="text-base font-bold font-rubik text-[#111111]">{t("shops.detail.mapOffTitle")}</h3>
                <p className="text-xs text-[#B7B7B7] max-w-sm mx-auto mt-1">
                  {t("shops.detail.mapOffDesc")}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] space-y-4">
                <div className="h-64 w-full bg-[#54D1CA]/10 rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-[#54D1CA]/30">
                  <div className="w-10 h-10 rounded-full bg-[#54D1CA] text-white flex items-center justify-center shadow-md mb-2 animate-bounce">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-[#111111]">{t("shops.detail.mapHere")}</span>
                  <span className="text-xs text-[#555555]">
                    {business.location.street} {business.location.houseNumber}, {business.location.city}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Reviews Tab */}
        {activeTab === "reviews" && (
          <div>
            {!hasReviews ? (
              <div className="p-8 text-center bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA]">
                <Lock className="w-8 h-8 text-[#B7B7B7] mx-auto mb-2" />
                <h3 className="text-base font-bold font-rubik text-[#111111]">{t("shops.detail.reviewsOffTitle")}</h3>
                <p className="text-xs text-[#B7B7B7] max-w-sm mx-auto mt-1">
                  {t("shops.detail.reviewsOffDesc")}
                </p>
              </div>
            ) : reviewsRes.loading ? (
              <LoadingState label={t("shops.detail.loadingReviews")} />
            ) : reviewsRes.error ? (
              <ErrorState message={reviewsRes.error} onRetry={reviewsRes.reload} />
            ) : reviews.length === 0 ? (
              <EmptyState title={t("shops.detail.noReviewsTitle")} description={t("shops.detail.noReviewsDesc")} />
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-2xl p-4 border border-[#EAEAEA] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#121F3E] text-white flex items-center justify-center text-xs font-bold">
                          {rev.consumerName.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-[#111111]">{rev.consumerName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[#D4B011] text-[#D4B011]" />
                        <span className="text-xs font-bold text-[#111111]">{rev.rating}</span>
                      </div>
                    </div>
                    {rev.title && <h4 className="text-xs font-bold text-[#111111]">{rev.title}</h4>}
                    <p className="text-xs text-[#555555] leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
