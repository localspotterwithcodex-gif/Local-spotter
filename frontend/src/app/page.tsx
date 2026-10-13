"use client";

import React, { useState } from "react";
import { Search, Sparkles, SlidersHorizontal, MapPin, Store } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { SegmentedSwitch } from "@/components/ui/SegmentedSwitch";
import { Input } from "@/components/ui/Input";
import { ProductCard } from "@/components/cards/ProductCard";
import { BusinessCard } from "@/components/cards/BusinessCard";
import { WorkshopCard } from "@/components/cards/WorkshopCard";
import { ShoprouteCard } from "@/components/cards/ShoprouteCard";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { LoadingState, ProductCardSkeleton } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";

type DiscoveryTab = "producten" | "workshops" | "shoproutes";

export default function DiscoveryHomePage() {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>("producten");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const onProducts = activeTab === "producten";
  const productsRes = useApiResource(
    onProducts ? `home-products:${selectedCategory ?? ""}:${searchQuery}` : null,
    () => api.getProducts({ category: selectedCategory || undefined, query: searchQuery || undefined })
  );
  const businessesRes = useApiResource(onProducts ? `home-businesses:${selectedCity ?? ""}` : null, () =>
    api.getBusinesses({ city: selectedCity || undefined })
  );
  const workshopsRes = useApiResource(activeTab === "workshops" ? "home-workshops" : null, () => api.getWorkshops());
  const routesRes = useApiResource(activeTab === "shoproutes" ? `home-routes:${selectedCity ?? ""}` : null, () =>
    api.getShoproutes({ city: selectedCity || undefined })
  );

  const products = productsRes.data ?? [];
  const businesses = businessesRes.data ?? [];
  const workshops = workshopsRes.data ?? [];
  const shoproutes = routesRes.data ?? [];

  const searchPlaceholder =
    activeTab === "shoproutes"
      ? "Which city are you shopping in?"
      : activeTab === "workshops"
      ? "Which workshop are you looking for?"
      : "Which product are you looking for?";

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        {/* Segmented Switch Discovery Tabs */}
        <div className="pt-2">
          <SegmentedSwitch
            options={[
              { id: "producten", label: "Products" },
              { id: "workshops", label: "Workshops" },
              { id: "shoproutes", label: "Shop Routes" },
            ]}
            activeId={activeTab}
            onChange={(id) => {
              setActiveTab(id as DiscoveryTab);
              setSelectedCategory(null);
              setSelectedCity(null);
            }}
          />
        </div>

        {/* Search Bar & Filter Action */}
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="flex-1">
            <Input
              placeholder={searchPlaceholder}
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-12 w-12 rounded-xl bg-[#FCE1F0] text-[#EA89B1] flex items-center justify-center hover:bg-[#F8D4E6] transition-colors shrink-0 shadow-2xs"
            aria-label="Filter categories"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Active Filter Chips */}
        {(selectedCategory || selectedCity) && (
          <div className="flex items-center gap-2 max-w-2xl mx-auto flex-wrap">
            <span className="text-xs font-bold text-[#8A95A5]">Active filter:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#EA89B1] text-white text-xs font-bold rounded-full shadow-2xs">
                {selectedCategory}
                <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:opacity-75">
                  ×
                </button>
              </span>
            )}
            {selectedCity && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FBBC3E] text-[#0A182E] text-xs font-bold rounded-full shadow-2xs">
                <MapPin className="w-3 h-3" />
                {selectedCity}
                <button onClick={() => setSelectedCity(null)} className="ml-1 hover:opacity-75">
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* TAB 1: PRODUCTEN */}
        {activeTab === "producten" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-rubik text-[#0A182E] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EA89B1]" />
                Popular Products
              </h2>
              <span className="text-xs font-bold text-[#8A95A5]">{products.length} results</span>
            </div>

            {productsRes.loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : productsRes.error ? (
              <ErrorState message={productsRes.error} onRetry={productsRes.reload} />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products found"
                description="There are no products matching your search query."
                actionLabel="Clear filters"
                onAction={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* "Onze Locals" Business Section */}
            <div className="pt-6 border-t border-[#EAEAEA] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-rubik text-[#0A182E] flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#EA89B1]" />
                  Our Locals (Shops)
                </h2>
              </div>
              {businessesRes.loading ? (
                <LoadingState label="Loading shops..." />
              ) : businessesRes.error ? (
                <ErrorState message={businessesRes.error} onRetry={businessesRes.reload} />
              ) : businesses.length === 0 ? (
                <EmptyState title="No shops found" description="There are no shops available yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {businesses.slice(0, 4).map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: WORKSHOPS */}
        {activeTab === "workshops" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-rubik text-[#111111]">Available Workshops</h2>
              <span className="text-xs font-bold text-[#B7B7B7]">{workshops.length} workshops</span>
            </div>

            {workshopsRes.loading ? (
              <LoadingState label="Loading workshops..." />
            ) : workshopsRes.error ? (
              <ErrorState message={workshopsRes.error} onRetry={workshopsRes.reload} />
            ) : workshops.length === 0 ? (
              <EmptyState
                title="No workshops found"
                description="There are currently no workshops scheduled matching your search query."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {workshops.map((workshop) => (
                  <WorkshopCard key={workshop.id} workshop={workshop} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: SHOPROUTES */}
        {activeTab === "shoproutes" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-rubik text-[#111111]">Interactive Shop Routes</h2>
              <span className="text-xs font-bold text-[#B7B7B7]">{shoproutes.length} routes</span>
            </div>

            {routesRes.loading ? (
              <LoadingState label="Loading shop routes..." />
            ) : routesRes.error ? (
              <ErrorState message={routesRes.error} onRetry={routesRes.reload} />
            ) : shoproutes.length === 0 ? (
              <EmptyState
                title="No shop routes found"
                description="No shop routes are available for this search query yet."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shoproutes.map((route) => (
                  <ShoprouteCard key={route.id} route={route} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Category Modal */}
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          mode={activeTab === "producten" ? "products" : activeTab}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onSelectCity={(city) => setSelectedCity(city)}
        />
      </div>
    </ConsumerLayout>
  );
}
