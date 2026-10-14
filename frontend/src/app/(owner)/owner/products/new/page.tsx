"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ProductSize } from "@/types/product";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

export default function AddProductPage() {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const categories = useApiResource("product-categories", () => api.getProductCategories());

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [imageUrlsText, setImageUrlsText] = useState("");

  const [selectedSizes, setSelectedSizes] = useState<ProductSize[]>([]);
  // Files picked via ImageUploader. The backend stores image URLs only and has
  // no file-upload endpoint yet, so these are not sent (see the note below).
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableSizes: ProductSize[] = ["S", "M", "L", "XL", "XXL"];

  const toggleSize = (sz: ProductSize) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!business) {
      setError(t("ownerx.error.noShop"));
      return;
    }
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    if (!name.trim() || Number.isNaN(priceNum) || Number.isNaN(stockNum)) {
      setError(t("ownerx.error.requiredFields"));
      return;
    }

    const imageUrls = imageUrlsText
      .split(/\s+/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (imageUrls.length > 3) {
      setError(t("ownerx.product.errorMaxImages"));
      return;
    }

    setIsSubmitting(true);
    let createdId: string | null = null;
    try {
      const created = await api.createProduct(business.id, {
        name: name.trim(),
        price: priceNum,
        stock: stockNum,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
        shopUrl: externalUrl.trim() || undefined,
        imageUrls,
      });
      createdId = created.id;
      for (const size of selectedSizes) {
        await api.addProductVariant(created.id, { size, stock: stockNum });
      }
      router.push("/owner");
    } catch (err) {
      const message = errMsg(err);
      setError(
        createdId
          ? t("ownerx.product.errorSizesFailed", { message })
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageShell = (content: React.ReactNode) => (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>
        {content}
      </div>
    </OwnerLayout>
  );

  if (businessLoading) return pageShell(<LoadingState label={t("ownerx.loadingShop")} />);
  if (businessError) return pageShell(<ErrorState message={businessError} onRetry={reloadBusiness} />);
  if (!business) {
    return pageShell(
      <EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forProducts")} />
    );
  }

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("ownerx.product.title")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("ownerx.product.subtitle")}</p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product Images (Max 3 enforced) — manual upload only, PROMPT.md items 7 & 8 */}
            <ImageUploader label={t("ownerx.product.imagesLabel")} maxImages={3} onChange={setImageFiles} />
            {imageFiles.length > 0 && (
              <p className="text-xs font-bold text-[#E54666] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t("ownerx.product.uploadUnsupported")}
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#111111]">{t("ownerx.product.imageUrlsLabel")}</label>
              <textarea
                rows={3}
                className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                placeholder={t("ownerx.product.imageUrlsPlaceholder")}
                value={imageUrlsText}
                onChange={(e) => setImageUrlsText(e.target.value)}
              />
              <span className="text-xs text-[#B7B7B7]">{t("ownerx.product.imageUrlsHelp")}</span>
            </div>

            {/* Product Name */}
            <Input
              label={t("ownerx.product.nameLabel")}
              placeholder={t("ownerx.product.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Price & Compare Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("ownerx.product.priceLabel")}
                type="number"
                step="0.01"
                placeholder="149.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label={t("ownerx.product.comparePriceLabel")}
                type="number"
                step="0.01"
                placeholder="179.00"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                helperText={t("ownerx.product.comparePriceHelp")}
              />
            </div>

            {/* Stock & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("ownerx.product.stockLabel")}
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                helperText={selectedSizes.length > 0 ? t("ownerx.product.stockHelp") : undefined}
                min={0}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#111111]">{t("ownerx.product.categoryLabel")}</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categories.loading || !!categories.error}
                  required
                  className="w-full h-12 bg-[#EAEAEA] text-[#111111] text-base px-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent disabled:opacity-60"
                >
                  <option value="">{categories.loading ? t("ownerx.product.categoriesLoading") : t("ownerx.product.categoryChoose")}</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categories.error && (
                  <span className="text-xs text-[#ED4C5C] font-medium block">
                    {t("ownerx.product.categoriesFailed")}{" "}
                    <button type="button" onClick={categories.reload} className="underline font-bold">
                      {t("common.retry")}
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* Sizes Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#111111] block">{t("ownerx.product.sizesLabel")}</label>
              <div className="flex gap-2">
                {availableSizes.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#FA1EFF] text-white shadow-xs"
                          : "bg-[#EAEAEA] text-[#111111] hover:bg-[#FAE2F0]"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Shop Product Link */}
            <Input
              label={t("ownerx.product.shopLinkLabel")}
              placeholder={t("ownerx.product.shopLinkPlaceholder")}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              helperText={t("ownerx.product.shopLinkHelp")}
            />

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#111111]">{t("ownerx.product.descLabel")}</label>
              <textarea
                rows={4}
                className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                placeholder={t("ownerx.product.descPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Link href="/owner" className="flex-1">
                <Button variant="ghost" size="lg" fullWidth type="button">
                  {t("ownerx.product.cancel")}
                </Button>
              </Link>
              <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting}>
                {t("ownerx.product.create")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
