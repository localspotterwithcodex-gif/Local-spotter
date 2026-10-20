"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Plus, X } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ServerImageUploader } from "@/components/ui/ServerImageUploader";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PRODUCT_SIZES, type Product, type ProductSize } from "@/types/product";
import type { Business } from "@/types/business";
import { api, type UploadedImage } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { useLocale } from "@/i18n/LocaleContext";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/** Colour palette from the Figma "add product" frame. */
const PALETTE = ["#210E31", "#E54666", "#5CB89A", "#4D5BD6", "#A63CD6", "#2FD6A0"];
const HEX = /^#[0-9a-f]{6}$/i;

const variantKey = (size?: string | null, color?: string | null) => `${size ?? ""}|${color ?? ""}`;

/** One variant per size×colour (or per size / per colour when only one kind is chosen). */
function wantedVariants(sizes: string[], colors: string[]): { size?: string; color?: string }[] {
  if (sizes.length && colors.length) return sizes.flatMap((size) => colors.map((color) => ({ size, color })));
  if (sizes.length) return sizes.map((size) => ({ size }));
  return colors.map((color) => ({ color }));
}

interface FormProps {
  business: Business;
  product?: Product;
}

function ProductForm({ business, product }: FormProps) {
  const router = useRouter();
  const { t } = useLocale();
  const errMsg = useErrorMessage();
  const categories = useApiResource("product-categories", () => api.getProductCategories());
  const isEdit = !!product;

  const existingImages: UploadedImage[] = useMemo(
    () => (product?.imageRefs ?? []).map((r) => ({ id: r.mediaAssetId, url: r.url })),
    [product]
  );

  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(product?.sourceName ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice ? String(product.compareAtPrice) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "10");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState(product?.sourceDescription ?? "");
  const [externalUrl, setExternalUrl] = useState(product?.externalUrl ?? "");
  const [active, setActive] = useState(product?.isActive ?? true);
  const [vatRate, setVatRate] = useState(String(product?.vatRate ?? 21));
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [weightGrams, setWeightGrams] = useState(product?.weightGrams != null ? String(product.weightGrams) : "");
  const [lengthMm, setLengthMm] = useState(product?.lengthMm != null ? String(product.lengthMm) : "");
  const [widthMm, setWidthMm] = useState(product?.widthMm != null ? String(product.widthMm) : "");
  const [heightMm, setHeightMm] = useState(product?.heightMm != null ? String(product.heightMm) : "");
  const [sizes, setSizes] = useState<ProductSize[]>(
    () => Array.from(new Set((product?.variants ?? []).map((v) => v.size).filter((s): s is ProductSize => !!s)))
  );
  const [colors, setColors] = useState<string[]>(
    () => Array.from(new Set((product?.variants ?? []).map((v) => v.colorName).filter((c): c is string => !!c)))
  );
  const [customColor, setCustomColor] = useState("#FA1EFF");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Pre-select the category once the list is available (edit mode).
  const resolvedCategoryId = categoryId || (product && categories.data?.find((c) => c.name === product.category)?.id) || "";

  const toggleSize = (sz: ProductSize) => setSizes((prev) => (prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]));
  const toggleColor = (c: string) => setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const compareNum = compareAtPrice.trim() === "" ? undefined : parseFloat(compareAtPrice);
    if (!name.trim() || Number.isNaN(priceNum) || Number.isNaN(stockNum) || (compareNum !== undefined && Number.isNaN(compareNum))) {
      setError(t("ownerx.error.requiredFields"));
      return;
    }
    if (compareNum !== undefined && compareNum <= priceNum) {
      setError(t("manage.product.errorCompare"));
      return;
    }

    const intOrUndef = (v: string) => (v.trim() === "" ? undefined : Number.parseInt(v, 10));
    const specs = {
      vatRate: Number(vatRate),
      brand: brand.trim() || undefined,
      weightGrams: intOrUndef(weightGrams),
      lengthMm: intOrUndef(lengthMm),
      widthMm: intOrUndef(widthMm),
      heightMm: intOrUndef(heightMm),
    };
    if ([specs.weightGrams, specs.lengthMm, specs.widthMm, specs.heightMm].some((n) => n !== undefined && (Number.isNaN(n) || n < 0))) {
      setError(t("ownerx.product.errorSpecs"));
      return;
    }

    setIsSubmitting(true);
    let savedId: string | null = product?.id ?? null;
    try {
      if (!isEdit) {
        const created = await api.createProduct(business.id, {
          name: name.trim(),
          price: priceNum,
          compareAtPrice: compareNum,
          stock: stockNum,
          categoryId: resolvedCategoryId || undefined,
          description: description.trim() || undefined,
          shopUrl: externalUrl.trim() || undefined,
          images,
          ...specs,
        });
        savedId = created.id;
        for (const v of wantedVariants(sizes, colors)) {
          await api.addProductVariant(created.id, { ...v, stock: stockNum });
        }
      } else {
        await api.updateProduct(product.id, {
          name: name.trim(),
          description: description.trim(),
          price: priceNum,
          compareAtPrice: compareNum,
          stock: stockNum,
          categoryId: resolvedCategoryId || undefined,
          shopUrl: externalUrl.trim() || undefined,
          active,
          ...specs,
          // an emptied brand must clear the stored one
          brand: brand.trim(),
        });

        // photos: remove the ones taken out, add the new ones
        try {
          const keep = new Set(images.map((i) => i.id));
          for (const ref of product.imageRefs ?? []) {
            if (!keep.has(ref.mediaAssetId)) await api.removeProductImage(product.id, ref.id);
          }
          const had = new Set((product.imageRefs ?? []).map((r) => r.mediaAssetId));
          let order = images.length;
          for (const img of images) {
            if (!had.has(img.id)) await api.addProductImage(product.id, img, order++);
          }
        } catch (err) {
          setError(t("manage.product.errorImagesFailed", { message: errMsg(err) }));
          return;
        }

        // sizes/colours: add the combinations that are new, remove the ones deselected
        try {
          const want = wantedVariants(sizes, colors);
          const wantKeys = new Set(want.map((v) => variantKey(v.size, v.color)));
          const haveKeys = new Set((product.variants ?? []).map((v) => variantKey(v.size, v.colorName)));
          for (const v of product.variants ?? []) {
            if (!wantKeys.has(variantKey(v.size, v.colorName))) await api.deleteProductVariant(product.id, v.id);
          }
          for (const v of want) {
            if (!haveKeys.has(variantKey(v.size, v.color))) await api.addProductVariant(product.id, { ...v, stock: stockNum });
          }
        } catch (err) {
          setError(t("manage.product.errorVariantsFailed", { message: errMsg(err) }));
          return;
        }
      }
      router.push("/owner");
    } catch (err) {
      const message = errMsg(err);
      setError(!isEdit && savedId ? t("ownerx.product.errorSizesFailed", { message }) : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
      <div className="border-b border-[#EAEAEA] pb-4">
        <h1 className="text-xl font-bold font-rubik text-[#111111]">
          {isEdit ? t("manage.product.titleEdit") : t("ownerx.product.title")}
        </h1>
        <p className="text-xs text-[#B7B7B7]">{isEdit ? t("manage.product.subtitleEdit") : t("ownerx.product.subtitle")}</p>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <ServerImageUploader label={t("ownerx.product.imagesLabel")} value={images} onChange={setImages} max={3} onBusyChange={setUploading} />

        <p className="text-xs text-[#790166] bg-[#FAE2F0] rounded-xl px-3 py-2">{t("manage.product.translateHint")}</p>

        <Input
          label={t("ownerx.product.nameLabel")}
          placeholder={t("ownerx.product.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("ownerx.product.priceLabel")}
            type="number"
            step="0.01"
            min={0}
            placeholder="149.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <Input
            label={t("ownerx.product.comparePriceLabel")}
            type="number"
            step="0.01"
            min={0}
            placeholder="179.00"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            helperText={t("ownerx.product.comparePriceHelp")}
          />
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("ownerx.product.stockLabel")}
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            helperText={sizes.length > 0 || colors.length > 0 ? t("ownerx.product.stockHelp") : undefined}
            min={0}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="product-category" className="text-sm font-bold text-[#111111]">
              {t("ownerx.product.categoryLabel")}
            </label>
            <select
              id="product-category"
              value={resolvedCategoryId}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t("ownerx.product.brandLabel")} value={brand} maxLength={120} onChange={(e) => setBrand(e.target.value)} />
          <div className="space-y-1.5">
            <label htmlFor="product-vat" className="text-sm font-bold text-[#111111]">{t("ownerx.product.vatLabel")}</label>
            <select
              id="product-vat"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="w-full h-12 bg-[#EAEAEA] text-[#111111] text-base px-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
            >
              <option value="21">21%</option>
              <option value="9">9%</option>
              <option value="0">0%</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label={t("ownerx.product.weightLabel")} type="number" min={0} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} />
          <Input label={t("ownerx.product.lengthLabel")} type="number" min={0} value={lengthMm} onChange={(e) => setLengthMm(e.target.value)} />
          <Input label={t("ownerx.product.widthLabel")} type="number" min={0} value={widthMm} onChange={(e) => setWidthMm(e.target.value)} />
          <Input label={t("ownerx.product.heightLabel")} type="number" min={0} value={heightMm} onChange={(e) => setHeightMm(e.target.value)} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-[#111111] block">{t("ownerx.product.sizesLabel")}</span>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_SIZES.map((sz) => {
              const on = sizes.includes(sz);
              return (
                <button
                  key={sz}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSize(sz)}
                  className={`min-w-10 h-10 px-2 rounded-xl text-xs font-bold transition-all ${
                    on ? "bg-[#FA1EFF] text-white shadow-xs" : "bg-[#EAEAEA] text-[#111111] hover:bg-[#FAE2F0]"
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-bold text-[#111111] block">{t("manage.product.colorsLabel")}</span>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from(new Set([...PALETTE, ...colors])).map((c) => {
              const on = colors.includes(c);
              const isHex = HEX.test(c);
              return isHex ? (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  aria-label={c}
                  onClick={() => toggleColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${on ? "border-[#FA1EFF] scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ) : (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleColor(c)}
                  className={`h-8 px-3 rounded-full text-xs font-bold ${on ? "bg-[#FA1EFF] text-white" : "bg-[#EAEAEA] text-[#111111]"}`}
                >
                  {c}
                  <X className="inline w-3 h-3 ml-1" aria-label={t("manage.product.colorRemove", { color: c })} />
                </button>
              );
            })}
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#FA1EFF] cursor-pointer">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value.toUpperCase())}
                className="w-8 h-8 rounded-full border-0 p-0 bg-transparent cursor-pointer"
                aria-label={t("manage.product.colorAdd")}
              />
              <button
                type="button"
                onClick={() => !colors.includes(customColor) && toggleColor(customColor)}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("manage.product.colorAdd")}
              </button>
            </label>
          </div>
        </div>

        <Input
          label={t("ownerx.product.shopLinkLabel")}
          placeholder={t("ownerx.product.shopLinkPlaceholder")}
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          helperText={t("ownerx.product.shopLinkHelp")}
        />

        {isEdit && (
          <label className="flex items-center gap-2 text-sm font-bold text-[#111111] cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-[#FA1EFF]" />
            {t("manage.product.activeLabel")}
          </label>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
          <Link href="/owner" className="flex-1">
            <Button variant="ghost" size="lg" fullWidth type="button">
              {t("ownerx.product.cancel")}
            </Button>
          </Link>
          <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting} disabled={uploading}>
            {isEdit ? t("manage.product.save") : t("ownerx.product.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Shared page for "Add Product" and "Edit Product": resolves the shop (and product) before showing the form. */
export function ProductFormPage({ productId }: { productId?: string }) {
  const { t } = useLocale();
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const product = useApiResource(productId ? `owner-product:${productId}` : null, () => api.getOwnerProduct(productId!));

  const shell = (content: React.ReactNode) => (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="flex w-fit ml-auto items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("ownerx.backToDashboard")}
        </Link>
        {content}
      </div>
    </OwnerLayout>
  );

  if (businessLoading) return shell(<LoadingState label={t("ownerx.loadingShop")} />);
  if (businessError) return shell(<ErrorState message={businessError} onRetry={reloadBusiness} />);
  if (!business) {
    return shell(<EmptyState title={t("ownerx.noShop.title")} description={t("ownerx.noShop.forProducts")} />);
  }
  if (productId) {
    if (product.loading) return shell(<LoadingState label={t("manage.product.loading")} />);
    if (product.error) return shell(<ErrorState message={product.error} onRetry={product.reload} />);
    if (!product.data || product.data.businessId !== business.id) {
      return shell(<EmptyState title={t("manage.product.notFound")} description="" />);
    }
    // key: remount when the product (or the language-independent data) changes
    return shell(<ProductForm key={product.data.id} business={business} product={product.data} />);
  }
  return shell(<ProductForm business={business} />);
}
