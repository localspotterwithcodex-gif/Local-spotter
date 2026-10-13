export type ProductSize = "S" | "M" | "L" | "XL" | "XXL";

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  size?: ProductSize;
  colorName?: string;
  colorHex?: string;
  price?: number;
  stock: number;
}

export interface Product {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  images: string[]; // max 3
  category: string;
  stock: number;
  externalUrl?: string;
  rating: number;
  reviewCount: number;
  likeCount: number;
  viewCount: number;
  variants?: ProductVariant[];
  createdAt: string;
  isActive: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}
