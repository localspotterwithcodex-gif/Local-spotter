"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Star, Heart, ShoppingBag, ExternalLink, Store, Check, ArrowLeft, ImageOff } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { PRODUCT_SIZES, ProductSize } from "@/types/product";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";
import { useAuth } from "@/features/auth/AuthContext";
import { useCart } from "@/features/cart/CartContext";

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const { t } = useLocale();
  const f = useFormat();
  const errMsg = useErrorMessage();
  const { addItem } = useCart();
  const { isAuthenticated, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { data: product, error, loading: isLoading, reload } = useApiResource(`product:${productId}`, () =>
    api.getProductById(productId)
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // null = nothing chosen yet; the first variant is used as the default.
  const [pickedSize, setPickedSize] = useState<ProductSize | null>(null);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const variants = product?.variants ?? [];
  const selectedSize = pickedSize ?? variants[0]?.size ?? null;
  const selectedColor = pickedColor ?? variants[0]?.colorName ?? null;

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (role !== "CONSUMER") {
      setAddError(t("products.detail.onlyConsumers"));
      return;
    }

    let variantId: string | undefined;
    if (variants.length > 0) {
      const match = variants.find(
        (v) => (v.size ?? null) === selectedSize && (v.colorName ?? null) === selectedColor
      );
      if (!match) {
        setAddError(t("products.detail.variantUnavailable"));
        return;
      }
      variantId = match.id;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      await addItem({ businessId: product.businessId, productId: product.id, variantId, quantity });
      setIsAdded(true);
      window.setTimeout(() => setIsAdded(false), 2500);
    } catch (err) {
      setAddError(errMsg(err));
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <ConsumerLayout>
        <LoadingState label={t("products.detail.loading")} />
      </ConsumerLayout>
    );
  }

  if (error) {
    return (
      <ConsumerLayout>
        <ErrorState title={t("products.detail.unavailable")} message={error} onRetry={reload} />
      </ConsumerLayout>
    );
  }

  if (!product) {
    return (
      <ConsumerLayout>
        <ErrorState
          title={t("products.detail.notFound")}
          message={t("products.detail.notFoundDesc")}
        />
      </ConsumerLayout>
    );
  }

  const allSizes: ProductSize[] = [...PRODUCT_SIZES];
  const sizes = allSizes.filter((sz) => variants.some((v) => v.size === sz));
  const colorVariants = variants.filter(
    (v, idx) => v.colorName && variants.findIndex((o) => o.colorName === v.colorName) === idx
  );

  return (
    <ConsumerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("products.detail.back")}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-4 md:p-6 rounded-3xl border border-[#EAEAEA]">
          {/* LEFT: Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F9F9F9] border border-[#EAEAEA]">
              {product.images[selectedImageIndex] ? (
                <Image src={product.images[selectedImageIndex]} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#B7B7B7]">
                  <ImageOff className="w-10 h-10" />
                </div>
              )}
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
                    <Image src={img} alt={t("products.detail.thumbnailAlt")} fill className="object-cover" />
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
                  <span className="text-[#B7B7B7]">({t("products.detail.reviews", { n: product.reviewCount })})</span>
                </div>
                <div className="flex items-center gap-1 text-[#B7B7B7]">
                  <Heart className="w-3.5 h-3.5 text-[#ED4C5C]" />
                  <span>{t("products.detail.likes", { n: product.likeCount })}</span>
                </div>
              </div>

              {/* Price Block (EUR) */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl font-extrabold text-[#111111] font-manrope">
                  {f.currency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-[#B7B7B7] line-through font-medium">
                    {f.currency(product.compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-[#555555] leading-relaxed border-t border-[#F9F9F9] pt-3">
                {product.description}
              </p>

              {/* Size Selector */}
              {sizes.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[#111111] block">{t("products.detail.selectSize")}</span>
                <div className="flex gap-2">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPickedSize(sz)}
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
              )}

              {/* Color Swatch Selector */}
              {colorVariants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#111111] block">
                    {t("products.detail.color", { color: selectedColor ?? "" })}
                  </span>
                  <div className="flex gap-2">
                    {colorVariants.map(
                      (v) =>
                        v.colorName && (
                          <button
                            key={v.id}
                            onClick={() => setPickedColor(v.colorName || null)}
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
                <span className="text-xs font-bold text-[#111111]">{t("products.detail.quantity")}</span>
                <div className="flex items-center border border-[#EAEAEA] rounded-xl bg-[#F9F9F9]">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label={t("products.detail.decrease")}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[#111111] hover:bg-[#EAEAEA] rounded-l-xl"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label={t("products.detail.increase")}
                    className="w-9 h-9 flex items-center justify-center font-bold text-[#111111] hover:bg-[#EAEAEA] rounded-r-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3 pt-4 border-t border-[#EAEAEA]">
              {addError && (
                <div role="alert" className="bg-[#F2D9DE]/50 border border-[#ED4C5C]/30 text-[#555555] text-xs rounded-2xl p-3">
                  {addError}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                isLoading={isAdding}
                className="gap-2"
              >
                {isAdded ? (
                  <>
                    <Check className="w-5 h-5" /> {t("products.detail.added")}
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" /> {t("products.detail.addToCart")}
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
                  <ExternalLink className="w-4 h-4" /> {t("products.detail.viewWebshop")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </ConsumerLayout>
  );
}
