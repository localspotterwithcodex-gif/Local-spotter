"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Check, Plus, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ProductSize } from "@/types/product";
import { api } from "@/lib/api";

export default function AddProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [category, setCategory] = useState("Bag");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const [selectedSizes, setSelectedSizes] = useState<ProductSize[]>(["M", "L"]);
  // Files the user has manually picked via ImageUploader — nothing is
  // uploaded to storage until this form is submitted (PROMPT.md items 7 & 8).
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

    if (!name || !price) {
      setError("Vul a.u.b. alle verplichte velden in.");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: upload each File in imageFiles to the Supabase `products`
      // storage bucket here (PROMPT.md item 15), then pass the resulting
      // public URLs as `images` below instead of an empty array.
      await api.createProduct({
        name,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        stock: parseInt(stock, 10),
        category,
        description,
        externalUrl: externalUrl || undefined,
        images: [],
        businessId: "bus-1",
        businessName: "Bag Shop Horn Center",
      });
      router.push("/owner");
    } catch (err: any) {
      setError(err.message || "Product aanmaken mislukt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Product Toevoegen</h1>
            <p className="text-xs text-[#B7B7B7]">Voeg een nieuw product toe aan je winkelcatalogus op LocalSpotter</p>
          </div>

          {error && (
            <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Product Images (Max 3 enforced) — manual upload only, PROMPT.md items 7 & 8 */}
            <ImageUploader label="Product Images" maxImages={3} onChange={setImageFiles} />

            {/* Product Name */}
            <Input
              label="Product Name *"
              placeholder="Bijv. Handgemaakte Leren Shopper"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Price & Compare Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prijs (€) *"
                type="number"
                step="0.01"
                placeholder="149.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label="Oude Prijs (€) (Optioneel)"
                type="number"
                step="0.01"
                placeholder="179.00"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
              />
            </div>

            {/* Stock & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Voorraad (Stock) *"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#111111]">Categorie *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 bg-[#EAEAEA] text-[#111111] text-base px-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                >
                  <option value="Bag">Bag (Tassen)</option>
                  <option value="Dress">Dress (Jurken)</option>
                  <option value="Trousers">Trousers (Broeken)</option>
                  <option value="Jacket">Jacket (Jassen)</option>
                  <option value="Furniture">Furniture (Wonen)</option>
                  <option value="Interior">Interior (Interieur)</option>
                  <option value="Beauty">Beauty (Verzorging)</option>
                </select>
              </div>
            </div>

            {/* Sizes Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#111111] block">Beschikbare Maten:</label>
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
              label="Optionele Webshop Link (Shop-system product link)"
              placeholder="https://jouwwinkel.nl/product/123"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              helperText="Link naar het product in je eigen webshop (indien van toepassing)"
            />

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#111111]">Product Beschrijving</label>
              <textarea
                rows={4}
                className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                placeholder="Beschrijf het materiaal, pasvorm en details van het product..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Link href="/owner" className="flex-1">
                <Button variant="ghost" size="lg" fullWidth type="button">
                  ANNULEREN
                </Button>
              </Link>
              <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting}>
                CREATE
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
