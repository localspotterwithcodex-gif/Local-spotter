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

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  heroImageUrl?: string;
  category: string;
  shopType: string;
  /** Real value should come from GET /businesses/:id/subscription (backend/src/subscriptions) — see PROMPT.md items 5 & 6. */
  subscriptionTier?: "WEBSHOP" | "SHOPROUTES" | "WORKSHOP";
  description: string;
  phone: string;
  email?: string;
  kvkNumber: string;
  location: BusinessLocation;
  hours?: BusinessHours[];
  rating: number;
  reviewCount: number;
  followerCount: number;
  productCount: number;
  subscriptionPlan: PlanSlug;
  status: "ACTIVE" | "PENDING_APPROVAL" | "INACTIVE";
  createdAt: string;
}
