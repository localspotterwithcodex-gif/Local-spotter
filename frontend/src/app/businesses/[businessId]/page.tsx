"use client";

import { PanoramaViewer } from "@/components/PanoramaViewer";
import React, { useState, use } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Star, Heart, MapPin, Phone, FileText, ShoppingBag, Calendar, Lock, Check, MessageCircle, Globe, Store, Video, Orbit, Navigation } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ProductCard } from "@/components/cards/ProductCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { usePageView } from "@/lib/hooks/usePageView";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";
import { useAuth } from "@/features/auth/AuthContext";
import { googleDirectionsUrl, googleMapsUrl, hasCoords, osmEmbedUrl } from "@/lib/geocode";
import { SOCIAL_LABEL } from "@/lib/social-links";

/** "https://www.example.com/path/" → "example.com/path" for compact display. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

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
  const liveViews = usePageView("shop", resolvedId);
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
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
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
            <div className="grid grid-cols-5 gap-2 py-3 px-4 bg-[#F9F9F9] rounded-2xl border border-[#EAEAEA] text-center my-4">
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
              <div>
                <span className="block text-sm font-bold text-[#111111]">{liveViews ?? business.viewCount ?? 0}</span>
                <span className="text-[11px] text-[#B7B7B7]">{t("shops.detail.views")}</span>
              </div>
            </div>

            {business.description && <p className="text-sm leading-relaxed text-[#555555]">{business.description}</p>}
          </div>
        </div>
      </div>

      {/* Right sidebar: 360° view, shop video and shop details */}
      <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24" aria-label={t("manage.shop.details")}>
        {business.panoramaUrl && (
          <section className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3" aria-label={t("panorama.title")}>
            <h2 className="flex items-center gap-2 text-sm font-bold font-rubik text-[#111111]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAE2F0] text-[#FA1EFF]"><Orbit className="h-4 w-4" aria-hidden="true" /></span>
              {t("panorama.title")}
            </h2>
            <PanoramaViewer src={business.panoramaUrl} alt={t("panorama.alt", { name: business.name })} className="aspect-[16/10]" />
          </section>
        )}

        {business.videoUrl && (
          <section className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3" aria-label={t("manage.video.publicTitle")}>
            <h2 className="flex items-center gap-2 text-sm font-bold font-rubik text-[#111111]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAE2F0] text-[#FA1EFF]"><Video className="h-4 w-4" aria-hidden="true" /></span>
              {t("manage.video.publicTitle")}
            </h2>
            <video
              src={business.videoUrl}
              controls
              preload="metadata"
              playsInline
              className="w-full rounded-xl border border-[#EEEEEE] bg-black aspect-video"
              aria-label={t("manage.video.publicAlt", { name: business.name })}
            />
          </section>
        )}

        <section className="bg-white rounded-2xl border border-[#EAEAEA] p-4 space-y-3" aria-label={t("manage.shop.details")}>
          <h2 className="flex items-center gap-2 text-sm font-bold font-rubik text-[#111111]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAE2F0] text-[#FA1EFF]"><Store className="h-4 w-4" aria-hidden="true" /></span>
            {t("manage.shop.details")}
          </h2>
          <dl className="divide-y divide-[#F2F2F2] text-xs">
            <div className="flex items-start justify-between gap-3 py-2.5">
              <dt className="flex items-center gap-2 text-[#6B6B6B] shrink-0"><MapPin className="h-4 w-4" aria-hidden="true" /> {t("manage.shop.address")}</dt>
              <dd className="text-right font-medium text-[#111111] break-words min-w-0">
                {business.location.street} {business.location.houseNumber}, {business.location.city}
              </dd>
            </div>
            {business.phone && (
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[#6B6B6B] shrink-0"><Phone className="h-4 w-4" aria-hidden="true" /> {t("ownerx.settings.phone")}</dt>
                <dd className="text-right font-medium text-[#111111]">{business.phone}</dd>
              </div>
            )}
            {business.kvkNumber && (
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[#6B6B6B] shrink-0"><FileText className="h-4 w-4" aria-hidden="true" /> {t("ownerx.settings.kvk")}</dt>
                <dd className="text-right font-medium text-[#111111]">{business.kvkNumber}</dd>
              </div>
            )}
            {business.websiteUrl && (
              <div className="flex items-start justify-between gap-3 py-2.5">
                <dt className="flex items-center gap-2 text-[#6B6B6B] shrink-0"><Globe className="h-4 w-4" aria-hidden="true" /> {t("ownerx.settings.website")}</dt>
                <dd className="text-right font-bold text-[#FA1EFF] min-w-0 truncate">
                  <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{displayUrl(business.websiteUrl)}</a>
                </dd>
              </div>
            )}
            {(business.socialLinks ?? []).map((l) => (
              <div key={l.platform} className="flex items-start justify-between gap-3 py-2.5">
                <dt className="text-[#6B6B6B] shrink-0">{SOCIAL_LABEL[l.platform]}</dt>
                <dd className="text-right font-bold text-[#FA1EFF] min-w-0 truncate">
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">{displayUrl(l.url)}</a>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>

      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
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
                {hasCoords(business.location.lat, business.location.lng) ? (
                  <>
                    <iframe
                      title={t("shops.detail.mapHere")}
                      src={osmEmbedUrl(business.location.lat, business.location.lng)}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-72 w-full rounded-xl border border-[#EAEAEA]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-xs text-[#555555]">
                        <MapPin className="w-4 h-4 text-[#54D1CA]" aria-hidden="true" />
                        {business.location.street} {business.location.houseNumber}, {business.location.city}
                      </p>
                      <div className="flex gap-2">
                        <a href={googleMapsUrl(business.location.lat, business.location.lng)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#EAEAEA] px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#F9F9F9]">
                          {t("manage.geo.openMap")}
                        </a>
                        <a href={googleDirectionsUrl(business.location.lat, business.location.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#FA1EFF] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                          <Navigation className="w-3.5 h-3.5" aria-hidden="true" /> {t("manage.geo.directions")}
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-48 w-full bg-[#54D1CA]/10 rounded-xl flex flex-col items-center justify-center border border-[#54D1CA]/30 text-center px-4">
                    <MapPin className="w-6 h-6 text-[#54D1CA] mb-2" aria-hidden="true" />
                    <span className="text-sm font-bold text-[#111111]">{t("shops.detail.mapHere")}</span>
                    <span className="text-xs text-[#555555]">
                      {business.location.street} {business.location.houseNumber}, {business.location.city}
                    </span>
                    <span className="mt-1 text-[11px] text-[#B7B7B7]">{t("manage.geo.noPin")}</span>
                  </div>
                )}
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
      </div>
    </ConsumerLayout>
  );
}
