/**
 * Typed API facade over the NestJS backend. Every method performs a real HTTP
 * request; nothing here reads local mock data. Errors propagate as ApiError so
 * pages can render an error state (never a silent fallback).
 */
import { apiClient, ApiError, qs } from "./client";
import {
  RawBooking, RawBusiness, RawOrder, RawPlan, RawProduct, RawReview, RawRoute, RawSubscription, RawWorkshop,
  toBooking, toBusiness, toOrder, toPlan, toProduct, toReview, toShoproute, toSubscription, toWorkshop,
} from "./mappers";
import { PLAN_FEATURES } from "@/content/plan-features";
import type { Product, ProductCategory } from "@/types/product";
import type { Business } from "@/types/business";
import type { Workshop, WorkshopBooking } from "@/types/workshop";
import type { Shoproute } from "@/types/shoproute";
import type { Order, OrderStatus } from "@/types/order";
import type { Review } from "@/types/review";
import type { BusinessSubscription, PlanSlug, SubscriptionPlan } from "@/types/subscription";

const unwrap = <T>(res: T[] | { data: T[] }): T[] => (Array.isArray(res) ? res : res.data);
const notFoundToNull = async <T>(p: Promise<T>): Promise<T | null> => {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null;
    throw e;
  }
};

export interface CartLine {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  total: number;
  variantLabel?: string;
}
export interface ServerCart {
  id: string | null;
  business: { id: string; name: string } | null;
  items: CartLine[];
  subtotal: number;
  deliveryFee: number;
}
interface RawCart {
  id: string | null;
  business: { id: string; name: string } | null;
  items: {
    id: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { name: string; images?: { mediaAsset?: { url: string } | null }[] };
    variant?: { size?: string | null; color?: string | null } | null;
  }[];
  subtotal: number;
  deliveryFee: number;
}

export interface ConsumerProfileInfo {
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}
interface RawConsumerProfileInfo {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  user?: { email?: string | null } | null;
}
const toConsumerProfileInfo = (r: RawConsumerProfileInfo): ConsumerProfileInfo => ({
  displayName: r.displayName,
  firstName: r.firstName ?? undefined,
  lastName: r.lastName ?? undefined,
  phone: r.phone ?? undefined,
  email: r.user?.email ?? undefined,
});

export interface DeliveryAddressInput {
  street: string;
  houseNumber?: string;
  city: string;
  postalCode?: string;
  country?: string;
  notes?: string;
}

export interface ConsumerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string | null;
  street: string;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  countryCode: string;
  isDefault: boolean;
}

export interface ConsumerAddressInput {
  label: string;
  fullName: string;
  phone?: string;
  street: string;
  houseNumber?: string;
  postalCode?: string;
  city: string;
  countryCode?: string;
  isDefault?: boolean;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
  shopUrl?: string;
  active?: boolean;
  imageUrls?: string[];
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
}

/** Fields accepted by POST /businesses (CreateBusinessDto). */
export interface CreateBusinessInput {
  name: string;
  kvkNumber: string;
  state: string;
  city: string;
  address: string;
  description?: string;
  phone?: string;
  email?: string;
  categoryId?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}
/** Fields accepted by PATCH /businesses/:id (UpdateBusinessDto). */
export type UpdateBusinessInput = Partial<CreateBusinessInput>;

export interface CreateWorkshopInput {
  businessId: string;
  title: string;
  description?: string;
  price: number;
  capacity: number;
  location?: string;
  /** YYYY-MM-DD (local) */
  date: string;
  /** HH:MM (local) */
  startTime: string;
  /** HH:MM (local) */
  finishTime: string;
  imageUrl?: string;
}

export const api = {
  // ---------------- PRODUCTS ----------------
  async getProductCategories(): Promise<ProductCategory[]> {
    return apiClient.get<ProductCategory[]>("/products/categories");
  },

  async getProducts(params?: { category?: string; query?: string; businessId?: string; limit?: number }): Promise<Product[]> {
    let categoryId: string | undefined;
    if (params?.category) {
      const cats = await this.getProductCategories();
      const wanted = params.category.toLowerCase();
      categoryId = cats.find((c) => c.name.toLowerCase() === wanted || c.slug.toLowerCase() === wanted)?.id;
      if (!categoryId) return []; // unknown category → nothing matches
    }
    const res = await apiClient.get<RawProduct[]>(
      `/products${qs({ categoryId, search: params?.query, businessId: params?.businessId })}`
    );
    const list = res.map(toProduct);
    return params?.limit ? list.slice(0, params.limit) : list;
  },

  async getProductById(id: string): Promise<Product | null> {
    const raw = await notFoundToNull(apiClient.get<RawProduct>(`/products/${id}`));
    return raw ? toProduct(raw) : null;
  },

  async getBusinessProducts(businessId: string): Promise<Product[]> {
    const res = await apiClient.get<RawProduct[]>(`/businesses/${businessId}/products`);
    return res.map(toProduct);
  },

  async createProduct(businessId: string, input: CreateProductInput): Promise<Product> {
    const { imageUrls, ...body } = input;
    const created = await apiClient.post<RawProduct>(`/businesses/${businessId}/products`, body);
    for (const url of (imageUrls ?? []).slice(0, 3)) {
      await apiClient.post(`/products/${created.id}/images`, { url });
    }
    const full = await apiClient.get<RawProduct>(`/products/${created.id}`);
    return toProduct(full);
  },

  async setProductActive(productId: string, active: boolean): Promise<void> {
    await apiClient.patch(`/products/${productId}`, { active });
  },

  async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}`);
  },

  // ---------------- BUSINESSES ----------------
  async getBusinesses(params?: { query?: string; city?: string; limit?: number }): Promise<Business[]> {
    const res = await apiClient.get<RawBusiness[]>(
      `/businesses${qs({ search: params?.query, city: params?.city, limit: params?.limit })}`
    );
    return res.map(toBusiness);
  },

  async getBusinessById(idOrSlug: string): Promise<Business | null> {
    const raw = await notFoundToNull(apiClient.get<RawBusiness>(`/businesses/${idOrSlug}`));
    return raw ? toBusiness(raw) : null;
  },

  /** Businesses owned by the signed-in owner. */
  async getMyBusinesses(): Promise<Business[]> {
    const res = await apiClient.get<RawBusiness[]>("/businesses/my");
    return res.map(toBusiness);
  },

  // ---------------- WORKSHOPS ----------------
  async getWorkshops(params?: { limit?: number; businessId?: string }): Promise<Workshop[]> {
    const path = params?.businessId
      ? `/businesses/${params.businessId}/workshops${qs({ limit: params.limit })}`
      : `/workshops${qs({ limit: params?.limit })}`;
    const res = await apiClient.get<RawWorkshop[] | { data: RawWorkshop[] }>(path);
    return unwrap(res).map(toWorkshop);
  },

  async getWorkshopById(id: string): Promise<Workshop | null> {
    const raw = await notFoundToNull(apiClient.get<RawWorkshop>(`/workshops/${id}`));
    return raw ? toWorkshop(raw) : null;
  },

  async bookWorkshop(workshopId: string, quantity: number): Promise<WorkshopBooking> {
    const raw = await apiClient.post<RawBooking>(`/workshops/${workshopId}/bookings`, { quantity });
    return toBooking(raw);
  },

  async getMyWorkshopBookings(): Promise<WorkshopBooking[]> {
    const res = await apiClient.get<RawBooking[] | { data: RawBooking[] }>("/workshops/bookings?limit=100");
    return unwrap(res).map(toBooking);
  },

  async getBusinessWorkshopBookings(businessId: string): Promise<WorkshopBooking[]> {
    const res = await apiClient.get<RawBooking[] | { data: RawBooking[] }>(
      `/businesses/${businessId}/workshop-bookings?limit=100`
    );
    return unwrap(res).map(toBooking);
  },

  // ---------------- SHOP ROUTES ----------------
  async getShoproutes(params?: { city?: string; limit?: number }): Promise<Shoproute[]> {
    const res = await apiClient.get<RawRoute[] | { data: RawRoute[] }>(
      `/shop-routes${qs({ city: params?.city, limit: params?.limit })}`
    );
    return unwrap(res).map(toShoproute);
  },

  async getShoprouteById(id: string): Promise<Shoproute | null> {
    const raw = await notFoundToNull(apiClient.get<RawRoute>(`/shop-routes/${id}`));
    return raw ? toShoproute(raw) : null;
  },

  // ---------------- CART ----------------
  async getCart(): Promise<ServerCart> {
    const raw = await apiClient.get<RawCart>("/cart");
    return {
      id: raw.id,
      business: raw.business,
      subtotal: raw.subtotal,
      deliveryFee: raw.deliveryFee,
      items: raw.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId ?? undefined,
        productName: i.product.name,
        imageUrl: i.product.images?.[0]?.mediaAsset?.url,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        total: i.total,
        variantLabel: [i.variant?.size, i.variant?.color].filter(Boolean).join(" / ") || undefined,
      })),
    };
  },
  addToCart: (input: { businessId: string; productId: string; variantId?: string; quantity: number }) =>
    apiClient.post("/cart/items", input),
  updateCartItem: (itemId: string, quantity: number) => apiClient.patch(`/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => apiClient.delete(`/cart/items/${itemId}`),
  clearCart: () => apiClient.delete("/cart"),

  // ---------------- SAVED ADDRESSES (consumer) ----------------
  async getAddresses(): Promise<ConsumerAddress[]> {
    const res = await apiClient.get<ConsumerAddress[] | { data: ConsumerAddress[] }>("/addresses");
    return unwrap(res);
  },
  createAddress: (input: ConsumerAddressInput) => apiClient.post<ConsumerAddress>("/addresses", input),
  updateAddress: (id: string, input: Partial<ConsumerAddressInput>) => apiClient.patch<ConsumerAddress>(`/addresses/${id}`, input),
  deleteAddress: (id: string) => apiClient.delete<{ deleted: true }>(`/addresses/${id}`),

  // ---------------- ORDERS ----------------
  /** Creates the order from the server-side cart; totals are computed by the backend. */
  async createOrder(deliveryAddress: DeliveryAddressInput): Promise<Order> {
    const raw = await apiClient.post<RawOrder>("/orders", { deliveryAddress });
    return toOrder(raw);
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await apiClient.get<RawOrder[] | { data: RawOrder[] }>("/orders?limit=100");
    return unwrap(res).map(toOrder);
  },

  async getBusinessOrders(businessId: string): Promise<Order[]> {
    const res = await apiClient.get<RawOrder[] | { data: RawOrder[] }>(`/businesses/${businessId}/orders?limit=100`);
    return unwrap(res).map(toOrder);
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const raw = await notFoundToNull(apiClient.get<RawOrder>(`/orders/${orderId}`));
    return raw ? toOrder(raw) : null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const raw = await apiClient.patch<RawOrder>(`/orders/${orderId}/status`, { status });
    return toOrder(raw);
  },

  // ---------------- REVIEWS ----------------
  async getBusinessReviews(businessId: string): Promise<Review[]> {
    const res = await apiClient.get<{ reviews: RawReview[] }>(`/businesses/${businessId}/reviews`);
    return res.reviews.map(toReview);
  },

  /** Every review (incl. unpublished) of a business the caller owns. */
  async getManagedBusinessReviews(businessId: string): Promise<Review[]> {
    const res = await apiClient.get<{ reviews: RawReview[] }>(`/businesses/${businessId}/reviews/manage`);
    return res.reviews.map(toReview);
  },

  async getMyReviews(): Promise<Review[]> {
    const res = await apiClient.get<RawReview[]>("/reviews/mine");
    return res.map(toReview);
  },

  createReview: (businessId: string, input: { rating: number; title: string; comment: string }) =>
    apiClient.post(`/businesses/${businessId}/reviews`, input),

  // ---------------- CONSUMER PROFILE & FOLLOWING ----------------
  async getConsumerProfile(): Promise<ConsumerProfileInfo> {
    return toConsumerProfileInfo(await apiClient.get<RawConsumerProfileInfo>("/users/profile/consumer"));
  },

  async updateConsumerProfile(input: { displayName?: string; phone?: string }): Promise<ConsumerProfileInfo> {
    return toConsumerProfileInfo(await apiClient.patch<RawConsumerProfileInfo>("/users/profile/consumer", input));
  },

  /** Businesses the signed-in consumer follows, as full Business records. */
  async getFollowedBusinesses(): Promise<Business[]> {
    const followed = await apiClient.get<{ id: string; name: string }[]>("/businesses/me/following");
    const businesses = await Promise.all(followed.map((f) => this.getBusinessById(f.id)));
    return businesses.filter((b): b is Business => b !== null);
  },

  // ---------------- OWNER ----------------
  async getBusinessCategories(): Promise<BusinessCategory[]> {
    return apiClient.get<BusinessCategory[]>("/businesses/categories");
  },

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    const raw = await apiClient.post<RawBusiness>("/businesses", input);
    return toBusiness(raw);
  },

  async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<Business> {
    const raw = await apiClient.patch<RawBusiness>(`/businesses/${businessId}`, input);
    return toBusiness(raw);
  },

  /** Replaces the weekly opening hours (Zondag = 0 … Zaterdag = 6 on the backend). */
  async updateBusinessHours(businessId: string, hours: NonNullable<Business["hours"]>): Promise<void> {
    const DAY_INDEX: Record<string, number> = {
      Zondag: 0, Maandag: 1, Dinsdag: 2, Woensdag: 3, Donderdag: 4, Vrijdag: 5, Zaterdag: 6,
    };
    await apiClient.patch(`/businesses/${businessId}/hours`, {
      hours: hours.map((h) => ({
        dayOfWeek: DAY_INDEX[h.day],
        isClosed: h.isClosed,
        ...(h.isClosed ? {} : { openTime: h.openTime, closeTime: h.closeTime }),
      })),
    });
  },

  async createWorkshop(input: CreateWorkshopInput): Promise<Workshop> {
    const { date, startTime, finishTime, ...rest } = input;
    const raw = await apiClient.post<RawWorkshop>("/workshops", {
      ...rest,
      startTime: new Date(`${date}T${startTime}`).toISOString(),
      endTime: new Date(`${date}T${finishTime}`).toISOString(),
    });
    return toWorkshop(raw);
  },

  async addProductVariant(productId: string, input: { size?: string; color?: string; stock: number }): Promise<void> {
    await apiClient.post(`/products/${productId}/variants`, input);
  },

  async cancelSubscription(businessId: string): Promise<BusinessSubscription> {
    const raw = await apiClient.delete<RawSubscription>(`/businesses/${businessId}/subscription`);
    return toSubscription(raw);
  },

  async getFollowStatus(businessId: string): Promise<boolean> {
    const res = await apiClient.get<{ isFollowing: boolean }>(`/businesses/${businessId}/follow-status`);
    return res.isFollowing;
  },

  // The backend DTO validates a `businessId` body on both follow and unfollow.
  async followBusiness(businessId: string): Promise<boolean> {
    const res = await apiClient.post<{ isFollowing: boolean }>(`/businesses/${businessId}/follow`, { businessId });
    return res.isFollowing;
  },

  async unfollowBusiness(businessId: string): Promise<boolean> {
    const res = await apiClient.delete<{ isFollowing: boolean }>(`/businesses/${businessId}/follow`, {
      body: JSON.stringify({ businessId }),
    });
    return res.isFollowing;
  },

  // ---------------- SUBSCRIPTIONS ----------------
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const res = await apiClient.get<RawPlan[]>("/subscriptions/plans");
    return res.map((p) => toPlan(p, PLAN_FEATURES[p.slug.toLowerCase() as PlanSlug] ?? []));
  },

  async getBusinessSubscription(businessId: string): Promise<BusinessSubscription | null> {
    const raw = await notFoundToNull(apiClient.get<RawSubscription>(`/businesses/${businessId}/subscription`));
    return raw ? toSubscription(raw) : null;
  },

  async selectPlan(businessId: string, planSlug: PlanSlug): Promise<BusinessSubscription> {
    const raw = await apiClient.post<RawSubscription>(`/businesses/${businessId}/subscription`, {
      planSlug: planSlug.toUpperCase(),
    });
    return toSubscription(raw);
  },
};
