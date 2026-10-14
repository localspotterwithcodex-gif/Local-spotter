/**
 * Maps NestJS/Prisma responses onto the frontend domain types in src/types.
 * Prisma serialises Decimal as a string and DateTime as an ISO string, so all
 * money/coordinates are converted here once instead of inside pages.
 */
import type { Product, ProductVariant } from "@/types/product";
import type { Business, BusinessHours } from "@/types/business";
import type { Workshop, WorkshopBooking } from "@/types/workshop";
import type { RouteStop, Shoproute } from "@/types/shoproute";
import type { Order, OrderItem, OrderStatus } from "@/types/order";
import type { Review } from "@/types/review";
import type { PlanSlug, SubscriptionPlan, BusinessSubscription } from "@/types/subscription";

type Dec = string | number | null | undefined;
export const num = (v: Dec, fallback = 0): number => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ---- raw response shapes (only the fields we read) ----
export interface RawProduct {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  price: Dec;
  stock: number;
  active: boolean;
  shopUrl?: string | null;
  compareAtPrice?: Dec | null;
  translations?: Record<string, Record<string, string>> | null;
  sourceLocale?: string | null;
  createdAt: string;
  category?: { id: string; name: string } | null;
  images?: { id?: string; mediaAssetId?: string; mediaAsset?: { url: string } | null }[];
  variants?: { id: string; productId: string; sku?: string | null; size?: string | null; color?: string | null; price?: Dec; stock: number }[];
  business?: { id: string; name: string } | null;
  averageRating?: number;
  ratingCount?: number;
}

export interface RawBusiness {
  id: string;
  ownerProfileId: string;
  name: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  kvkNumber: string;
  category?: { id: string; name: string } | null;
  logoAsset?: { url: string } | null;
  coverAsset?: { url: string } | null;
  state: string;
  city: string;
  street: string;
  houseNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  countryCode: string;
  latitude?: Dec;
  longitude?: Dec;
  status: string;
  averageRating?: Dec;
  ratingCount?: number;
  followerCount?: number;
  createdAt: string;
  hours?: { dayOfWeek: number; openTime?: string | null; closeTime?: string | null; isClosed: boolean }[];
  subscription?: { status: string; plan?: { slug: string } | null } | null;
  _count?: { products?: number };
}

const DAYS: BusinessHours["day"][] = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

export function toProduct(r: RawProduct): Product {
  const variants: ProductVariant[] | undefined = r.variants?.length
    ? r.variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku ?? undefined,
        size: (v.size ?? undefined) as ProductVariant["size"],
        colorName: v.color ?? undefined,
        colorHex: v.color && /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : undefined,
        price: v.price === null || v.price === undefined ? undefined : num(v.price),
        stock: v.stock,
      }))
    : undefined;
  return {
    id: r.id,
    businessId: r.businessId,
    businessName: r.business?.name ?? "",
    name: r.name,
    price: num(r.price),
    compareAtPrice: r.compareAtPrice === null || r.compareAtPrice === undefined ? undefined : num(r.compareAtPrice),
    description: r.description ?? "",
    // The API localises name/description for display; the text as typed lives in translations[sourceLocale].
    sourceName: (r.sourceLocale && r.translations?.[r.sourceLocale]?.name) || r.name,
    sourceDescription: (r.sourceLocale && r.translations?.[r.sourceLocale]?.description) || r.description || "",
    images: (r.images ?? []).map((i) => i.mediaAsset?.url).filter((u): u is string => !!u),
    imageRefs: (r.images ?? [])
      .filter((i) => i.id && i.mediaAssetId && i.mediaAsset?.url)
      .map((i) => ({ id: i.id as string, mediaAssetId: i.mediaAssetId as string, url: (i.mediaAsset as { url: string }).url })),
    category: r.category?.name ?? "",
    stock: r.stock,
    externalUrl: r.shopUrl ?? undefined,
    // Ratings come from published reviews; the backend does not track likes or views yet.
    rating: r.averageRating ?? 0,
    reviewCount: r.ratingCount ?? 0,
    likeCount: 0,
    viewCount: 0,
    variants,
    createdAt: r.createdAt,
    isActive: r.active,
  };
}

export function toBusiness(r: RawBusiness): Business {
  const slug = (r.subscription?.plan?.slug ?? "WEBSHOP").toLowerCase() as PlanSlug;
  const subscriptionActive = r.subscription?.status === "ACTIVE" || r.subscription?.status === "TRIALING";
  return {
    id: r.id,
    ownerId: r.ownerProfileId,
    name: r.name,
    slug: r.slug,
    logoUrl: r.logoAsset?.url ?? undefined,
    heroImageUrl: r.coverAsset?.url ?? undefined,
    category: r.category?.name ?? "",
    shopType: r.category?.name ?? "",
    subscriptionTier: subscriptionActive ? (slug.toUpperCase() as Business["subscriptionTier"]) : undefined,
    description: r.description ?? "",
    phone: r.phone ?? "",
    email: r.email ?? undefined,
    kvkNumber: r.kvkNumber,
    location: {
      lat: num(r.latitude),
      lng: num(r.longitude),
      street: r.address || r.street,
      houseNumber: r.houseNumber ?? undefined,
      city: r.city,
      province: r.state,
      postalCode: r.postalCode ?? undefined,
      country: r.countryCode,
    },
    hours: r.hours?.map((h) => ({
      day: DAYS[h.dayOfWeek] ?? "Maandag",
      openTime: h.openTime ?? "",
      closeTime: h.closeTime ?? "",
      isClosed: h.isClosed,
    })),
    rating: num(r.averageRating),
    reviewCount: r.ratingCount ?? 0,
    followerCount: r.followerCount ?? 0,
    productCount: r._count?.products ?? 0,
    subscriptionPlan: slug,
    status: r.status === "ACTIVE" ? "ACTIVE" : r.status === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : "INACTIVE",
    createdAt: r.createdAt,
  };
}

export interface RawWorkshop {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  price: Dec;
  capacity: number;
  bookedCount: number;
  startTime: string;
  endTime: string;
  location?: string | null;
  imageUrl?: string | null;
  imageAsset?: { url: string } | null;
  status: string;
  createdAt: string;
  business?: { id: string; name: string } | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function toWorkshop(r: RawWorkshop): Workshop {
  const start = new Date(r.startTime);
  const end = new Date(r.endTime);
  return {
    id: r.id,
    businessId: r.businessId,
    businessName: r.business?.name ?? "",
    title: r.title,
    description: r.description ?? "",
    price: num(r.price),
    capacity: r.capacity,
    bookedCount: r.bookedCount,
    imageUrl: r.imageAsset?.url ?? r.imageUrl ?? undefined,
    location: r.location ?? "",
    date: ymd(start),
    startTime: hm(start),
    finishTime: hm(end),
    status: r.status === "FULL" ? "PUBLISHED" : (r.status as Workshop["status"]),
    createdAt: r.createdAt,
  };
}

export interface RawBooking {
  id: string;
  workshopId: string;
  ticketQuantity: number;
  totalAmount: Dec;
  status: string;
  createdAt: string;
  workshop?: { id: string; title: string } | null;
  consumerProfileId?: string;
  consumerProfile?: { id: string; displayName?: string | null; firstName?: string | null; lastName?: string | null } | null;
}

export function toBooking(r: RawBooking): WorkshopBooking {
  return {
    id: r.id,
    workshopId: r.workshopId,
    workshopTitle: r.workshop?.title ?? "",
    consumerId: r.consumerProfile?.id ?? r.consumerProfileId ?? "",
    consumerName:
      [r.consumerProfile?.firstName, r.consumerProfile?.lastName].filter(Boolean).join(" ") ||
      r.consumerProfile?.displayName ||
      "",
    ticketQuantity: r.ticketQuantity,
    totalAmount: num(r.totalAmount),
    status: r.status === "CANCELLED" ? "CANCELLED" : r.status === "PENDING" ? "PENDING" : "CONFIRMED",
    createdAt: r.createdAt,
  };
}

export interface RawRoute {
  id: string;
  title: string;
  city: string;
  description?: string | null;
  status: string;
  createdAt: string;
  stops?: {
    id: string;
    businessId: string;
    title: string;
    sequence: number;
    latitude: Dec;
    longitude: Dec;
    description?: string | null;
    business?: { id: string; name: string; city?: string } | null;
  }[];
}

export function toShoproute(r: RawRoute): Shoproute {
  const stops: RouteStop[] = (r.stops ?? []).map((s) => ({
    id: s.id,
    businessId: s.businessId,
    businessName: s.business?.name ?? s.title,
    businessCategory: "",
    address: s.description ?? s.business?.city ?? "",
    lat: num(s.latitude),
    lng: num(s.longitude),
    sequenceOrder: s.sequence,
  }));
  return {
    id: r.id,
    title: r.title,
    cityName: r.city,
    description: r.description ?? "",
    shopCount: stops.length,
    stops,
    status: r.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    createdAt: r.createdAt,
  };
}

export interface RawOrder {
  id: string;
  orderNumber: string;
  consumerProfileId: string;
  businessId: string;
  status: string;
  subtotalAmount: Dec;
  deliveryFee: Dec;
  totalAmount: Dec;
  deliveryStreet: string;
  deliveryHouseNumber?: string | null;
  deliveryCity: string;
  deliveryPostalCode?: string | null;
  deliveryCountry: string;
  createdAt: string;
  updatedAt: string;
  business?: { id: string; name: string } | null;
  consumerProfile?: { id: string; displayName?: string | null; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  items?: {
    id: string;
    productId: string;
    productNameSnapshot: string;
    variantSnapshot?: string | null;
    unitPrice: Dec;
    quantity: number;
    subtotalPrice: Dec;
  }[];
}

export function toOrder(r: RawOrder): Order {
  const items: OrderItem[] = (r.items ?? []).map((i) => ({
    id: i.id,
    productId: i.productId,
    productName: i.productNameSnapshot,
    variantSize: i.variantSnapshot ?? undefined,
    unitPrice: num(i.unitPrice),
    quantity: i.quantity,
    totalPrice: num(i.subtotalPrice),
  }));
  const cp = r.consumerProfile;
  const name = cp ? [cp.firstName, cp.lastName].filter(Boolean).join(" ") || cp.displayName || "" : "";
  return {
    id: r.id,
    orderNumber: r.orderNumber,
    consumerId: r.consumerProfileId,
    consumerName: name,
    businessId: r.businessId,
    businessName: r.business?.name ?? "",
    items,
    subtotal: num(r.subtotalAmount),
    deliveryFee: num(r.deliveryFee),
    total: num(r.totalAmount),
    status: r.status as OrderStatus,
    deliveryAddress: {
      fullName: name,
      phone: cp?.phone ?? "",
      street: r.deliveryStreet,
      houseNumber: r.deliveryHouseNumber ?? "",
      city: r.deliveryCity,
      postalCode: r.deliveryPostalCode ?? "",
      country: r.deliveryCountry,
    },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export interface RawReview {
  id: string;
  businessId: string;
  productId?: string | null;
  consumerProfileId: string;
  rating: number;
  title?: string | null;
  comment: string;
  createdAt: string;
  business?: { id: string; name: string } | null;
  consumerProfile?: { displayName?: string | null; firstName?: string | null; lastName?: string | null } | null;
}

export function toReview(r: RawReview): Review {
  const cp = r.consumerProfile;
  return {
    id: r.id,
    businessId: r.businessId,
    businessName: r.business?.name,
    productId: r.productId ?? undefined,
    consumerId: r.consumerProfileId,
    consumerName: cp?.displayName || [cp?.firstName, cp?.lastName].filter(Boolean).join(" ") || "",
    rating: r.rating,
    title: r.title ?? undefined,
    comment: r.comment,
    createdAt: r.createdAt,
  };
}

export interface RawPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  monthlyPrice: Dec;
  currency: string;
}

export function toPlan(r: RawPlan, features: string[]): SubscriptionPlan {
  const slug = r.slug.toLowerCase() as PlanSlug;
  return {
    id: r.id,
    slug,
    name: r.name,
    monthlyPrice: num(r.monthlyPrice),
    currency: r.currency,
    description: r.description ?? "",
    features,
    hasShoproutes: slug !== "webshop",
    hasWorkshops: slug === "workshop",
    hasReviews: slug === "workshop",
    hasFollowers: slug === "workshop",
  };
}

export interface RawSubscription {
  id: string;
  businessId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  plan?: { slug: string } | null;
}

export function toSubscription(r: RawSubscription): BusinessSubscription {
  const status = r.status === "ACTIVE" || r.status === "TRIALING" ? "ACTIVE" : r.status === "PAST_DUE" ? "PAST_DUE" : r.status === "CANCELLED" ? "CANCELLED" : "INACTIVE";
  return {
    id: r.id,
    businessId: r.businessId,
    planSlug: (r.plan?.slug ?? "WEBSHOP").toLowerCase() as PlanSlug,
    status,
    currentPeriodStart: r.currentPeriodStart,
    currentPeriodEnd: r.currentPeriodEnd,
    autoRenew: r.autoRenew,
  };
}
