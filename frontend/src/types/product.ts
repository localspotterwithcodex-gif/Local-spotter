export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

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
  /** Name/description exactly as the owner typed them (not translated); used by edit forms. */
  sourceName?: string;
  sourceDescription?: string;
  images: string[]; // max 3
  /** Image rows (id + media asset) so an edit form can remove single images. */
  imageRefs?: { id: string; mediaAssetId: string; url: string }[];
  category: string;
  stock: number;
  externalUrl?: string;
  /** VAT percentage included in the price. */
  vatRate: number;
  brand?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
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
