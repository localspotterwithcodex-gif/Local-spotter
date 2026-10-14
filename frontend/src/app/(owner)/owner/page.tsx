"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShoppingBag, Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { SubscriptionBadge, SubscriptionTier } from "@/components/ui/SubscriptionBadge";
import { ProductCard } from "@/components/cards/ProductCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useLocale } from "@/i18n/LocaleContext";
import type { TranslationKey } from "@/i18n/dictionaries";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import type { OrderStatus } from "@/types/order";

const ORDER_STATUS_TILES: { statuses: OrderStatus[]; labelKey: TranslationKey; className: string }[] = [
  { statuses: ["CONFIRMED", "PREPARING", "READY"], labelKey: "ownerx.dash.tileProcessing", className: "ls-status-processing" },
  { statuses: ["DELIVERED"], labelKey: "ownerx.dash.tileCompleted", className: "ls-status-completed" },
  { statuses: ["OUT_FOR_DELIVERY"], labelKey: "ownerx.dash.tileOnTheWay", className: "ls-status-ontheway" },
  { statuses: ["CANCELLED", "REJECTED"], labelKey: "ownerx.dash.tileCancelled", className: "ls-status-cancelled" },
  { statuses: ["PENDING"], labelKey: "ownerx.dash.tileNew", className: "ls-status-new col-span-2 sm:col-span-1" },
];

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
  const orders = useApiResource(businessId && `owner-orders:${businessId}`, () => api.getBusinessOrders(businessId!));

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
  const orderList = orders.data ?? [];

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Profile Header matching Figma 383:2322 */}
        <div className="bg-white rounded-3xl overflow-hidden border border-[#EAEAEA] shadow-2xs">
          <div className="relative h-36 md:h-48 w-full bg-[#FAE2F0]">
            {business.heroImageUrl && (
              <Image src={business.heroImageUrl} alt={business.name} fill className="object-cover" />
            )}
            <div className="absolute top-3 right-3">
              {business.subscriptionTier && <SubscriptionBadge tier={business.subscriptionTier as SubscriptionTier} />}
            </div>
          </div>

          <div className="p-4 md:p-6 relative pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-10 md:-mt-12 mb-3">
              <div className="flex items-end gap-3">
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white p-1 border-4 border-white shadow-md">
                  {business.logoUrl && (
                    <Image src={business.logoUrl} alt={business.name} fill className="object-cover rounded-xl" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold font-rubik text-[#111111]">{business.name}</h1>
                  <span className="text-xs font-bold text-[#FA1EFF]">{business.shopType}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Link href="/owner/products/new">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-4 h-4" /> {t("owner.addProduct")}
                  </Button>
                </Link>
                <Link href="/owner/workshops/new">
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-4 h-4" /> {t("ownerx.dash.workshopBtn")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Status Metrics Cards — real counts derived from this business's orders */}
        {orders.error ? (
          <ErrorState title={t("ownerx.dash.ordersLoadFailed")} message={orders.error} onRetry={orders.reload} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ORDER_STATUS_TILES.map((tile) => {
              const count = orderList.filter((o) => tile.statuses.includes(o.status)).length;
              return (
                <Link
                  key={tile.labelKey}
                  href="/owner/orders"
                  className={`p-3.5 rounded-2xl ${tile.className} flex flex-col justify-between h-24 hover:scale-[1.02] transition-transform`}
                >
                  <span className="text-[11px] font-bold">{t(tile.labelKey)}</span>
                  <span className="text-2xl font-extrabold font-rubik">{orders.loading ? "–" : count}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* My Products Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FA1EFF]" /> {t("ownerx.dash.myProducts", { n: productList.length })}
            </h2>
            <Link href="/owner/products/new" className="text-xs font-bold text-[#FA1EFF] hover:underline">
              {t("ownerx.dash.newProduct")}
            </Link>
          </div>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </div>

        {/* My Workshops Section */}
        <div className="space-y-4 pt-4 border-t border-[#EAEAEA]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#790166]" /> {t("ownerx.dash.myWorkshops", { n: workshopList.length })}
            </h2>
            <Link href="/owner/workshops/new" className="text-xs font-bold text-[#790166] hover:underline">
              {t("ownerx.dash.newWorkshop")}
            </Link>
          </div>

          {workshopError && <p className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl">{workshopError}</p>}
          {workshops.error ? (
            <ErrorState title={t("ownerx.dash.workshopsLoadFailed")} message={workshops.error} onRetry={workshops.reload} />
          ) : workshops.loading ? (
            <LoadingState label={t("ownerx.dash.workshopsLoading")} />
          ) : workshopList.length === 0 ? (
            <EmptyState title={t("ownerx.dash.noWorkshops")} description={t("ownerx.dash.noWorkshopsDesc")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>
    </OwnerLayout>
  );
}
