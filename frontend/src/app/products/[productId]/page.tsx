"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Heart, Eye, ShoppingBag, ExternalLink, Store, Check, ArrowLeft } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { Product, ProductSize } from "@/types/product";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/features/cart/CartContext";

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>("M");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      const data = await api.getProductById(productId);
      setProduct(data);
      if (data?.variants && data.variants.length > 0) {
        if (data.variants[0].colorName) setSelectedColor(data.variants[0].colorName);
        if (data.variants[0].size) setSelectedSize(data.variants[0].size);
      }
      setIsLoading(false);
    }
    loadProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    // This is what actually drives the header cart badge count
    // (PROMPT.md item 13/4) — previously this only flashed a fake
    // "added" state without touching any cart state at all.
    addItem({
      id: `${product.id}-${selectedSize || ""}-${selectedColor || ""}`,
      productId: product.id,
      name: product.name,
      image: product.images?.[0] || "",
      businessName: product.businessName,
      price: product.price,
      quantity,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label="Product details laden..." />
      </ConsumerLayout>
    );
  }

  if (!product) {
    return (
      <ConsumerLayout>
        <ErrorState
          title="Product niet gevonden"
          message="Dit product bestaat niet meer of is verwijderd."
        />
      </ConsumerLayout>
    );
  }

  const sizes: ProductSize[] = ["S", "M", "L", "XL", "XXL"];

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar producten
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-4 md:p-6 rounded-3xl border border-[#EAEAEA]">
          {/* LEFT: Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F9F9F9] border border-[#EAEAEA]">
              <Image
                src={product.images[selectedImageIndex] || "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            {/* Thumbnail selector (max 3 images) */}
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.slice(0, 3).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx ? "border-[#FA1EFF]" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt="Thumbnail" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Product Details & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Business Name Link */}
              <Link
                href={`/businesses/${product.businessId}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FA1EFF] hover:underline"
              >
                <Store className="w-3.5 h-3.5" />
                {product.businessName}
              </Link>

              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold font-rubik text-[#111111]">
                {product.name}
              </h1>

              {/* Rating & Metrics */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-[#D4B011] text-[#D4B011]" />
                  <span className="font-bold text-[#111111]">{product.rating}</span>
                  <span className="text-[#B7B7B7]">({product.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-[#B7B7B7]">
                  <Heart className="w-3.5 h-3.5 text-[#ED4C5C]" />
                  <span>{product.likeCount} likes</span>
                </div>
              </div>

              {/* Price Block (EUR) */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl font-extrabold text-[#111111] font-manrope">
                  {formatCurrency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-[#B7B7B7] line-through font-medium">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-[#555555] leading-relaxed border-t border-[#F9F9F9] pt-3">
                {product.description}
              </p>

              {/* Size Selector */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[#111111] block">Selecteer Maat:</span>
                <div className="flex gap-2">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                        selectedSize === sz
                          ? "bg-[#FA1EFF] text-white shadow-xs"
                          : "bg-[#EAEAEA] text-[#111111] hover:bg-[#FAE2F0]"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatch Selector */}
              {product.variants && product.variants.some((v) => v.colorName) && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#111111] block">
                    Kleur: {selectedColor}
                  </span>
                  <div className="flex gap-2">
                    {product.variants.map(
                      (v) =>
                        v.colorName && (
                          <button
                            key={v.id}
                            onClick={() => setSelectedColor(v.colorName || null)}
                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                              selectedColor === v.colorName ? "border-[#FA1EFF] scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: v.colorHex || "#CCCCCC" }}
                            title={v.colorName}
                          />
                        )
                    )}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-[#111111]">Aantal:</span>
                <div className="flex items-center border border-[#EAEAEA] rounded-xl bg-[#F9F9F9]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[#111111] hover:bg-[#EAEAEA] rounded-l-xl"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[#111111] hover:bg-[#EAEAEA] rounded-r-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4 border-t border-[#EAEAEA]">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                className="gap-2"
              >
                {isAdded ? (
                  <>
                    <Check className="w-5 h-5" /> Toegevoegd aan winkelwagen!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" /> In Winkelwagen
                  </>
                )}
              </Button>

              {product.externalUrl && (
                <a
                  href={product.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 rounded-xl bg-[#FAE2F0] text-[#FA1EFF] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#F5CEE6] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Bekijk op winkel webshop
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
