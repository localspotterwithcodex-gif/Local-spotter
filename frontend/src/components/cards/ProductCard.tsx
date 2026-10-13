"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, Star } from "lucide-react";
import { Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(product.likeCount);

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const imageSrc =
    product.images && product.images.length > 0
      ? product.images[0]
      : "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=400&q=80";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-2xl p-2.5 border border-[#EAEAEA] shadow-2xs hover:shadow-md hover:border-[#FAE2F0] transition-all"
    >
      {/* Product Image Container (190x190 8px radius) */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#F9F9F9]">
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {/* Translucent pale pink overlay from Figma spec */}
        <div className="absolute inset-x-0 bottom-0 bg-[#FAE2F0]/70 backdrop-blur-xs p-1.5 flex items-center justify-between">
          {/* Like / Heart Counter */}
          <button
            onClick={toggleLike}
            className="flex items-center gap-1 text-[11px] font-bold text-[#111111] hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isLiked ? "fill-[#ED4C5C] text-[#ED4C5C]" : "text-[#ED4C5C]"
              }`}
            />
            <span>{likeCount}</span>
          </button>

          {/* Views Counter */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#111111]">
            <Eye className="w-3.5 h-3.5 text-[#121F3E]" />
            <span>{product.viewCount}</span>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="mt-2.5 px-0.5 space-y-1">
        {/* Rating Row */}
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-[#D4B011] text-[#D4B011]" />
          <span className="text-xs font-bold text-[#111111]">{product.rating}</span>
          <span className="text-[11px] text-[#B7B7B7]">({product.reviewCount})</span>
        </div>

        {/* Title */}
        <h3 className="text-xs font-bold text-[#111111] line-clamp-2 leading-[1.3] group-hover:text-[#FA1EFF] transition-colors">
          {product.name}
        </h3>

        {/* Business Name */}
        <p className="text-[11px] text-[#B7B7B7] truncate">{product.businessName}</p>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-extrabold text-[#111111]">
            {formatCurrency(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-[#B7B7B7] line-through font-medium">
              {formatCurrency(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
