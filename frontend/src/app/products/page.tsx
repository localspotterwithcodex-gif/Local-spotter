"use client";

import React, { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { ProductCard } from "@/components/cards/ProductCard";
import { Input } from "@/components/ui/Input";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { ProductCardSkeleton, LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Product } from "@/types/product";

export default function ProductListingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      const data = await api.getProducts({
        category: selectedCategory || undefined,
        query: searchQuery || undefined,
      });
      setProducts(data);
      setIsLoading(false);
    }
    loadProducts();
  }, [searchQuery, selectedCategory]);

  return (
    <ConsumerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Alle Producten</h1>
            <p className="text-xs text-[#B7B7B7]">Ontdek unieke items van lokale Nederlandse winkeliers</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Zoek product..."
                icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="h-12 w-12 rounded-xl bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center hover:bg-[#F5CEE6] transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {selectedCategory && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#B7B7B7]">Categorie:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FA1EFF] text-white text-xs font-bold rounded-full">
              {selectedCategory}
              <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:opacity-75">
                ×
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Geen producten gevonden"
            description="Er zijn geen producten beschikbaar voor deze zoekopdracht."
            actionLabel="Reset filters"
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

        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          mode="products"
          onSelectCategory={(cat) => setSelectedCategory(cat)}
        />
      </div>
    </ConsumerLayout>
  );
}
