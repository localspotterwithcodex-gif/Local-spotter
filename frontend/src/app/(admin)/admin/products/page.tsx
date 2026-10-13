"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Package, Trash2, Eye } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { MOCK_PRODUCTS } from "@/data/mock/products";
import { formatCurrency } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Producten Moderatie</h1>
          <p className="text-xs text-[#B7B7B7]">Controleer en modereer alle gepubliceerde producten op het platform</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Winkel</th>
                  <th className="p-4">Categorie</th>
                  <th className="p-4">Prijs</th>
                  <th className="p-4">Voorraad</th>
                  <th className="p-4 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-bold text-[#111111]">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#F9F9F9] shrink-0">
                          <Image src={p.images[0] || ""} alt={p.name} fill className="object-cover" />
                        </div>
                        <span className="truncate max-w-xs">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#555555]">{p.businessName}</td>
                    <td className="p-4">{p.category}</td>
                    <td className="p-4 font-bold">{formatCurrency(p.price)}</td>
                    <td className="p-4">{p.stock} stuks</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-[#ED4C5C] hover:bg-[#F2D9DE] rounded-lg transition-colors"
                        title="Verwijder product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
