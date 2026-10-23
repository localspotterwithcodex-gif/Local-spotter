import type { SocialLink } from "@/lib/social-links";
import { PlanSlug } from "./subscription";

export interface BusinessLocation {
  lat: number;
  lng: number;
  street: string;
  houseNumber?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
}

export interface BusinessHours {
  day: "Maandag" | "Dinsdag" | "Woensdag" | "Donderdag" | "Vrijdag" | "Zaterdag" | "Zondag";
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface BusinessFulfilment {
  pickupEnabled: boolean;
  shippingEnabled: boolean;
  localDeliveryEnabled: boolean;
  /** null = platform default */
  shippingFee: number | null;
  freeShippingThreshold: number | null;
  localDeliveryFee: number;
  /** null = same town only */
  localDeliveryRadiusKm: number | null;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  heroImageUrl?: string;
  logoAssetId?: string;
  coverAssetId?: string;
  /** Equirectangular 360° photo of the shop (virtual store). */
  panoramaUrl?: string;
  panoramaAssetId?: string;
  /** Optional shop video (one per shop), shown on the public shop page. */
  videoUrl?: string;
  videoAssetId?: string;
  category: string;
  shopType: string;
  /** Real value should come from GET /businesses/:id/subscription (backend/src/subscriptions) — see PROMPT.md items 5 & 6. */
  subscriptionTier?: "WEBSHOP" | "SHOPROUTES" | "WORKSHOP";
  description: string;
  phone: string;
  email?: string;
  kvkNumber: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  /** One link per platform, shown on the shop page. */
  socialLinks?: SocialLink[];
  location: BusinessLocation;
  /** How customers can receive orders (owner settings; also returned for the public shop). */
  fulfilment?: BusinessFulfilment;
  hours?: BusinessHours[];
  rating: number;
  reviewCount: number;
  followerCount: number;
  productCount: number;
  subscriptionPlan: PlanSlug;
  status: "ACTIVE" | "PENDING_APPROVAL" | "INACTIVE";
  createdAt: string;
}
