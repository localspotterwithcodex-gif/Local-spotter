"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil, Trash2, Star, Users, Package, Share2, MapPin, X, ImageOff } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { ShoprouteCard } from "@/components/cards/ShoprouteCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;

  const products = useApiResource(businessId && `owner-products:${businessId}`, () => api.getBusinessProducts(businessId!));
  const workshops = useApiResource(businessId && `owner-workshops:${businessId}`, () => api.getWorkshops({ businessId: businessId! }));
  const routes = useApiResource(businessId && `owner-routes:${businessId}`, () => api.getShoproutes());
  const [tab, setTab] = useState<"products" | "shoproutes" | "workshops">("products");
  const [fabOpen, setFabOpen] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [workshopError, setWorkshopError] = useState("");
  const handleCancelWorkshop = async (id: string, title: string) => {
    if (!window.confirm(t("manage.workshop.cancelConfirm", { name: title }))) return;
    setCancellingId(id);
    setWorkshopError("");
    try {
      await api.cancelWorkshop(id);
      workshops.reload();
    } catch (err) {
      setWorkshopError(t("manage.workshop.cancelFailed", { message: errMsg(err) }));
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t("manage.product.deleteConfirm", { name }))) return;
    setDeleteError("");
    setDeletingId(id);
    try {
      await api.deleteProduct(id);
      products.reload();
    } catch (err) {
      setDeleteError(t("manage.product.deleteFailed", { message: errMsg(err) }));
    } finally {
      setDeletingId(null);
    }
  };

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
  const workshopList = workshops.data ?? [];

  const myRoutes = (routes.data ?? []).filter((r) => r.stops.some((s) => s.businessId === business.id));
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
        {/* Banner with stats (Figma "Retailers" / shop profile) */}
        <div className="relative h-60 -mx-4 sm:mx-0 bg-[#FAE2F0] sm:rounded-3xl overflow-hidden">
          {hasBanner ? (
            <Image src={business.heroImageUrl as string} alt={business.name} fill className="object-cover" sizes="640px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#B7B7B7]" aria-hidden="true">
              <ImageOff className="w-10 h-10" />
            </div>
          )}
          <Link
            href={`/businesses/${business.id}`}
            aria-label={business.name}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#FA1EFF] shadow"
          >
            <Share2 className="w-4 h-4" />
          </Link>
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

        {/* Producten / Shoproutes / Workshops */}
        <div className="px-4 sm:px-6 pt-4">
          <SegmentedSwitch
            options={[
              { id: "products", label: t("nav.products") },
              { id: "shoproutes", label: t("nav.shopRoutes") },
              { id: "workshops", label: t("nav.workshops") },
            ]}
            activeId={tab}
            onChange={(id) => setTab(id as typeof tab)}
          />
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-4">
          {tab === "products" && (
            <>
              {deleteError && (
                <div role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl">
                  {deleteError}
                </div>
              )}
              {products.error ? (
                <ErrorState title={t("ownerx.dash.productsLoadFailed")} message={products.error} onRetry={products.reload} />
              ) : products.loading ? (
                <LoadingState label={t("ownerx.dash.productsLoading")} />
              ) : productList.length === 0 ? (
                <EmptyState title={t("ownerx.dash.noProducts")} description={t("ownerx.dash.noProductsDesc")} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {productList.map((product) => (
                    <div key={product.id} className="space-y-2">
                      <div className={product.isActive ? "" : "opacity-60"}>
                        <ProductCard product={product} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                        <span className="text-[#B7B7B7]">
                          {product.isActive ? t("manage.product.stockLeft", { n: product.stock }) : t("manage.product.hidden")}
                        </span>
                        <span className="flex items-center gap-2">
                          <Link href={`/owner/products/${product.id}/edit`} className="inline-flex items-center gap-1 text-[#790166] hover:underline">
                            <Pencil className="w-3.5 h-3.5" /> {t("manage.product.edit")}
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={() => void handleDelete(product.id, product.name)}
                            className="inline-flex items-center gap-1 text-[#E54666] hover:underline disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> {t("manage.product.delete")}
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "shoproutes" && (
            <>
              {routes.error ? (
                <ErrorState message={routes.error} onRetry={routes.reload} />
              ) : routes.loading ? (
                <LoadingState label={t("ownerx.dash.loading")} />
              ) : myRoutes.length === 0 ? (
                <EmptyState title={t("manage.shop.noRoutes")} description={t("manage.shop.noRoutesDesc")} />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {myRoutes.map((r) => (
                    <ShoprouteCard key={r.id} route={r} />
                  ))}
                </div>
              )}
              <Link
                href="/owner/shoproutes/location"
                className="flex items-center justify-center gap-2 h-11 rounded-lg bg-[#FAE2F0] text-[#FA1EFF] text-xs font-bold hover:bg-[#F5CEE6]"
              >
                <MapPin className="w-4 h-4" /> {t("manage.shop.updateLocation")}
              </Link>
            </>
          )}

          {tab === "workshops" && (
            <>
              {workshopError && <p className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl">{workshopError}</p>}
              {workshops.error ? (
                <ErrorState title={t("ownerx.dash.workshopsLoadFailed")} message={workshops.error} onRetry={workshops.reload} />
              ) : workshops.loading ? (
                <LoadingState label={t("ownerx.dash.workshopsLoading")} />
              ) : workshopList.length === 0 ? (
                <EmptyState title={t("ownerx.dash.noWorkshops")} description={t("ownerx.dash.noWorkshopsDesc")} />
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {workshopList.map((workshop) => (
                    <div key={workshop.id} className="space-y-2">
                      <WorkshopCard workshop={workshop} />
                      {workshop.status === "CANCELLED" ? (
                        <p className="text-[11px] font-bold text-[#E54666]">{t("manage.workshop.cancelled")}</p>
                      ) : workshop.status === "COMPLETED" ? null : (
                        <button
                          type="button"
                          disabled={cancellingId === workshop.id}
                          onClick={() => handleCancelWorkshop(workshop.id, workshop.title)}
                          className="text-[11px] font-bold text-[#E54666] hover:underline disabled:opacity-50"
                        >
                          {t("manage.workshop.cancel")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
