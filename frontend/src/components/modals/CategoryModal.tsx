"use client";

import React, { useState } from "react";
import { X, Search, MapPin, Sparkles } from "lucide-react";
import { MOCK_PRODUCT_CATEGORIES } from "@/data/mock/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "products" | "workshops" | "shoproutes";
  onSelectCategory?: (category: string) => void;
  onSelectCity?: (city: string) => void;
}

const CITIES = [
  "Amsterdam",
  "Rotterdam",
  "Delft",
  "Utrecht",
  "Leiden",
  "Gouda",
  "Arnhem",
  "Nijmegen",
  "Groningen",
  "Meppel",
  "Leeuwarden",
];

const WORKSHOP_CATEGORIES = [
  "Sieraden",
  "Schoenen",
  "Hoedjes",
  "Interieuritems",
  "Jewelrystores",
  "Make up",
  "Keramiek",
  "Lederwaren",
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  mode = "products",
  onSelectCategory,
  onSelectCity,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const placeholder =
    mode === "shoproutes"
      ? "In welke stad ga je winkelen?"
      : mode === "workshops"
      ? "Welke workshop zoek je?"
      : "Welk product zoek je?";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAEAEA]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FA1EFF]" />
            <h2 className="text-lg font-bold font-rubik text-[#111111]">
              {mode === "shoproutes" ? "Kies een Stad" : "Populaire Categorieën"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#EAEAEA] transition-colors"
          >
            <X className="w-5 h-5 text-[#111111]" />
          </button>
        </div>

        {/* Search Bar inside Modal */}
        <div className="my-4">
          <Input
            placeholder={placeholder}
            icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories / Cities Grid */}
        <div className="space-y-4 pt-2">
          {mode === "shoproutes" ? (
            <div>
              <span className="text-xs font-bold text-[#B7B7B7] uppercase tracking-wider block mb-3">
                Steden met Shoproutes
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CITIES.filter((c) =>
                  c.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onSelectCity?.(city);
                      onClose();
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-[#F9F9F9] hover:bg-[#FAE2F0] hover:text-[#FA1EFF] border border-[#EAEAEA] text-xs font-bold text-[#111111] transition-all text-left"
                  >
                    <MapPin className="w-4 h-4 text-[#54D1CA] shrink-0" />
                    <span className="truncate">{city}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : mode === "workshops" ? (
            <div>
              <span className="text-xs font-bold text-[#B7B7B7] uppercase tracking-wider block mb-3">
                Workshop Categorieën
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WORKSHOP_CATEGORIES.filter((wc) =>
                  wc.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      onSelectCategory?.(cat);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-[#F9F9F9] hover:bg-[#FAE2F0] hover:text-[#FA1EFF] border border-[#EAEAEA] text-xs font-bold text-[#111111] transition-all text-center"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold text-[#B7B7B7] uppercase tracking-wider block mb-3">
                Product Categorieën
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MOCK_PRODUCT_CATEGORIES.filter((c) =>
                  c.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory?.(cat.name);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-[#F9F9F9] hover:bg-[#FAE2F0] hover:text-[#FA1EFF] border border-[#EAEAEA] text-xs font-bold text-[#111111] transition-all text-center"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </div>
  );
};
