"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Calendar, Plus } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Button } from "@/components/ui/Button";
import { SubscriptionBadge, SubscriptionTier } from "@/components/ui/SubscriptionBadge";
import { ProductCard } from "@/components/cards/ProductCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import type { OrderStatus } from "@/types/order";

const ORDER_STATUS_TILES: { statuses: OrderStatus[]; label: string; className: string }[] = [
  { statuses: ["CONFIRMED", "PREPARING", "READY"], label: "Processing", className: "ls-status-processing" },
  { statuses: ["DELIVERED"], label: "Completed", className: "ls-status-completed" },
  { statuses: ["OUT_FOR_DELIVERY"], label: "On the way", className: "ls-status-ontheway" },
  { statuses: ["CANCELLED", "REJECTED"], label: "Cancelled", className: "ls-status-cancelled" },
  { statuses: ["PENDING"], label: "New Orders", className: "ls-status-new col-span-2 sm:col-span-1" },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;

  const products = useApiResource(businessId && `owner-products:${businessId}`, () => api.getBusinessProducts(businessId!));
  const workshops = useApiResource(businessId && `owner-workshops:${businessId}`, () => api.getWorkshops({ businessId: businessId! }));
  const orders = useApiResource(businessId && `owner-orders:${businessId}`, () => api.getBusinessOrders(businessId!));

  if (businessLoading) {
    return (
      <OwnerLayout>
        <LoadingState label="Ondernemer dashboard laden..." />
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
          title="Nog geen winkel"
          description="Je hebt nog geen winkel aangemaakt. Registreer je winkel om producten en workshops toe te voegen."
          actionLabel="Winkel aanmaken"
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
                    <Plus className="w-4 h-4" /> Product Toevoegen
                  </Button>
                </Link>
                <Link href="/owner/workshops/new">
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-4 h-4" /> Workshop
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Status Metrics Cards — real counts derived from this business's orders */}
        {orders.error ? (
          <ErrorState title="Bestellingen konden niet worden geladen" message={orders.error} onRetry={orders.reload} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ORDER_STATUS_TILES.map((tile) => {
              const count = orderList.filter((o) => tile.statuses.includes(o.status)).length;
              return (
                <Link
                  key={tile.label}
                  href="/owner/orders"
                  className={`p-3.5 rounded-2xl ${tile.className} flex flex-col justify-between h-24 hover:scale-[1.02] transition-transform`}
                >
                  <span className="text-[11px] font-bold">{tile.label}</span>
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
              <ShoppingBag className="w-4 h-4 text-[#FA1EFF]" /> Mijn Producten ({productList.length})
            </h2>
            <Link href="/owner/products/new" className="text-xs font-bold text-[#FA1EFF] hover:underline">
              + Nieuw Product
            </Link>
          </div>

          {products.error ? (
            <ErrorState title="Producten konden niet worden geladen" message={products.error} onRetry={products.reload} />
          ) : products.loading ? (
            <LoadingState label="Producten laden..." />
          ) : productList.length === 0 ? (
            <EmptyState title="Nog geen producten" description="Voeg je eerste product toe aan je winkelcatalogus." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {productList.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* My Workshops Section */}
        <div className="space-y-4 pt-4 border-t border-[#EAEAEA]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-rubik text-[#111111] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#790166]" /> Mijn Workshops ({workshopList.length})
            </h2>
            <Link href="/owner/workshops/new" className="text-xs font-bold text-[#790166] hover:underline">
              + Nieuwe Workshop
            </Link>
          </div>

          {workshops.error ? (
            <ErrorState title="Workshops konden niet worden geladen" message={workshops.error} onRetry={workshops.reload} />
          ) : workshops.loading ? (
            <LoadingState label="Workshops laden..." />
          ) : workshopList.length === 0 ? (
            <EmptyState title="Nog geen workshops" description="Plan je eerste workshop voor je klanten." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workshopList.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </div>
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
