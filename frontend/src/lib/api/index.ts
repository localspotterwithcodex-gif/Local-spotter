/**
 * Typed API facade over the NestJS backend. Every method performs a real HTTP
 * request; nothing here reads local mock data. Errors propagate as ApiError so
 * pages can render an error state (never a silent fallback).
 */
import { apiClient, ApiError, qs } from "./client";
import {
  RawBooking, RawBusiness, RawOrder, RawPlan, RawProduct, RawReview, RawRoute, RawSubscription, RawWorkshop, RawWorkshopSession,
  toBooking, toBusiness, toOrder, toPlan, toProduct, toReview, toShoproute, toSubscription, toWorkshop, toWorkshopSession,
} from "./mappers";
import { PLAN_FEATURES } from "@/content/plan-features";
import type { Product, ProductCategory } from "@/types/product";
import type { Business } from "@/types/business";
import type { Workshop, WorkshopBooking, WorkshopParticipant, WorkshopSession } from "@/types/workshop";
import type { Shoproute } from "@/types/shoproute";
import type { FulfilmentMethod, Order, OrderStatus, PaymentState } from "@/types/order";
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
export interface FulfilmentOptions {
  pickup: { enabled: boolean; fee: number };
  shipping: { enabled: boolean; fee: number; freeAbove: number | null };
  localDelivery: { enabled: boolean; fee: number; radiusKm: number | null };
}
export interface CartGroup {
  business: { id: string; name: string; city?: string };
  items: CartLine[];
  subtotal: number;
  fulfilmentOptions: FulfilmentOptions;
}
export interface ServerCart {
  id: string | null;
  /** First store of the cart (kept for older screens). */
  business: { id: string; name: string } | null;
  items: CartLine[];
  groups: CartGroup[];
  subtotal: number;
  deliveryFee: number;
}
interface RawCartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { name: string; images?: { mediaAsset?: { url: string } | null }[] };
  variant?: { size?: string | null; color?: string | null } | null;
}
interface RawCart {
  id: string | null;
  business: { id: string; name: string } | null;
  items: RawCartItem[];
  groups?: {
    business: { id: string; name: string; city?: string };
    items: RawCartItem[];
    subtotal: number;
    fulfilmentOptions: FulfilmentOptions;
  }[];
  subtotal: number;
  deliveryFee: number;
}

export interface PaymentIntent {
  paymentId: string;
  purpose: "BUSINESS_SUBSCRIPTION" | "PRODUCT_ORDER" | "WORKSHOP_BOOKING";
  status: PaymentState;
  amount: number;
  currency: string;
  /** Hosted checkout of the payment provider; null if the payment is already settled. */
  checkoutUrl: string | null;
}
export interface PaymentInfo {
  id: string;
  purpose: PaymentIntent["purpose"];
  status: PaymentState;
  amount: number | string;
  currency: string;
  orderId?: string | null;
  customerOrderId?: string | null;
  workshopBookingId?: string | null;
  businessSubscriptionId?: string | null;
  checkoutUrl?: string | null;
}
export interface CreateOrderInput {
  deliveryAddress?: DeliveryAddressInput;
  fulfilments: { businessId: string; method: FulfilmentMethod }[];
}
export interface CheckoutOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orders: Order[];
}

export interface ConsumerProfileInfo {
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  /** Profile picture (MediaAsset id + url), absent when none is set. */
  avatar?: UploadedImage;
}
interface RawConsumerProfileInfo {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  user?: { email?: string | null } | null;
  profileImageAsset?: { id: string; url: string } | null;
}
const toConsumerProfileInfo = (r: RawConsumerProfileInfo): ConsumerProfileInfo => ({
  displayName: r.displayName,
  firstName: r.firstName ?? undefined,
  lastName: r.lastName ?? undefined,
  phone: r.phone ?? undefined,
  email: r.user?.email ?? undefined,
  avatar: r.profileImageAsset ? { id: r.profileImageAsset.id, url: r.profileImageAsset.url } : undefined,
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

/** An image already uploaded to storage (see api.uploadImage). */
export interface UploadedImage {
  /** MediaAsset id */
  id: string;
  url: string;
}

/** Server-signed ticket for a direct browser → Cloudinary video upload (POST /media/videos/ticket). */
export interface VideoUploadTicket {
  uploadUrl: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  allowedFormats: string;
  signature: string;
  maxBytes: number;
  maxSeconds: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  categoryId?: string;
  shopUrl?: string;
  active?: boolean;
  images?: UploadedImage[];
  vatRate?: number;
  brand?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, "images">>;

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
export type UpdateBusinessInput = Partial<CreateBusinessInput> & {
  /** MediaAsset id from api.uploadImage; null removes the image. */
  logoAssetId?: string | null;
  coverAssetId?: string | null;
  panoramaAssetId?: string | null;
  /** MediaAsset id from api.uploadShopVideo; null removes the video. */
  videoAssetId?: string | null;
  /** http(s) URLs; null clears the link. */
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  /** Replaces the whole list of social profiles (one per platform). */
  socialLinks?: { platform: string; url: string }[];
  pickupEnabled?: boolean;
  shippingEnabled?: boolean;
  localDeliveryEnabled?: boolean;
  shippingFee?: number | null;
  freeShippingThreshold?: number | null;
  localDeliveryFee?: number;
  localDeliveryRadiusKm?: number | null;
};

export interface NotificationPreferences {
  notifyOrders: boolean;
  notifyReviews: boolean;
  notifyTips: boolean;
}

export interface WorkshopSessionInput {
  /** YYYY-MM-DD (local) */
  date: string;
  /** HH:MM (local) */
  startTime: string;
  /** HH:MM (local) */
  finishTime: string;
  capacity?: number;
}

export interface CreateWorkshopInput {
  businessId: string;
  title: string;
  description?: string;
  price: number;
  capacity: number;
  location?: string;
  /** At least one session; each has its own seats (defaults to `capacity`). */
  sessions: WorkshopSessionInput[];
  cancellationDeadlineHours?: number;
  refundPercentage?: number;
  minAge?: number;
  imageUrl?: string;
  imageAssetId?: string;
}

export interface CreateShoprouteInput {
  title: string;
  city: string;
  description?: string;
  /** false saves a draft; default publishes immediately. */
  publish?: boolean;
  theme?: string;
  coverImageUrl?: string;
  stops: { businessId: string; title: string; latitude: number; longitude: number; sequence: number }[];
}

export interface BusinessBalance {
  currency: string;
  grossSalesCents: number;
  refundsCents: number;
  /** Platform commission kept (after refund reversals). */
  commissionCents: number;
  netSalesCents: number;
  paidOutCents: number;
  pendingPayoutCents: number;
  /** Net sales still inside the hold period. */
  onHoldCents: number;
  availableCents: number;
  nextReleaseAt: string | null;
  recentEntries: Array<{
    id: string;
    type: string;
    amountCents: number;
    createdAt: string;
    availableAt: string | null;
    orderNumber: string | null;
    workshopTitle: string | null;
  }>;
  payouts: Array<{ id: string; amountCents: number; status: string; requestedAt: string; paidAt: string | null; periodKey: string | null }>;
}

export interface PayoutAccount {
  configured: boolean;
  accountHolderName: string | null;
  /** Never the full IBAN. */
  ibanMasked: string | null;
}

export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED" | "CANCELLED";

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  customerName: string;
  status: ReturnStatus;
  reason: string;
  merchantNote: string | null;
  refundStatus: "PENDING" | "REFUNDED" | "NOT_REQUIRED" | "FAILED" | null;
  refundAmountCents: number | null;
  restocked: boolean;
  requestedAt: string;
  decidedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  items: Array<{ orderItemId: string; quantity: number; name: string; variant: string | null; unitPriceCents: number }>;
}

export interface CreateReturnInput {
  orderId: string;
  reason: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}

export interface Employee {
  id: string;
  email: string;
  role: "MANAGER" | "STAFF";
  status: "INVITED" | "ACTIVE";
  inviteExpiresAt: string | null;
  acceptedAt: string | null;
}
export interface StaffShop {
  businessId: string;
  businessName: string;
  city: string | null;
  role: "MANAGER" | "STAFF";
}

export interface ChatConversation {
  id: string;
  businessId: string;
  businessName: string;
  consumerName: string;
  lastMessage: { body: string; hasAttachment?: boolean; createdAt: string; mine: boolean } | null;
  lastMessageAt: string;
  unreadCount: number;
  blocked?: boolean;
}
export interface ChatMessage {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
}
export type ChatReportReason = "SPAM" | "HARASSMENT" | "FRAUD" | "INAPPROPRIATE" | "OTHER";
export interface ChatThread {
  conversation: { id: string; businessName: string; consumerName: string; viewerSide?: "consumer" | "business"; blocked?: boolean; blockedByMe?: boolean };
  messages: ChatMessage[];
}
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  linkUrl: string | null;
  createdAt: string;
}

export interface ProductSearchParams {
  category?: string;
  query?: string;
  businessId?: string;
  limit?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "popular" | "distance";
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const api = {
  // ---------------- MEDIA ----------------
  /** Uploads one image (any common raster image, max 5 MB) to the backend, which stores it in Cloudinary. */
  async uploadImage(file: File): Promise<UploadedImage> {
    const body = new FormData();
    body.append("file", file);
    return apiClient.post<UploadedImage>("/media/images", body);
  },

  /**
   * Uploads the shop video. The file goes straight from the browser to Cloudinary with a short-lived,
   * server-signed ticket (so it never passes through the Vercel proxy); the backend then re-checks the
   * stored file (format, size, duration, ownership) and returns the MediaAsset.
   */
  async uploadShopVideo(file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<UploadedImage> {
    const ticket = await apiClient.post<VideoUploadTicket>("/media/videos/ticket", {});
    if (file.size > ticket.maxBytes) throw new Error("VIDEO_TOO_LARGE");
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", ticket.apiKey);
    form.append("timestamp", ticket.timestamp);
    form.append("folder", ticket.folder);
    form.append("allowed_formats", ticket.allowedFormats);
    form.append("signature", ticket.signature);
    const publicId = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", ticket.uploadUrl);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as { public_id?: string };
          if (xhr.status >= 200 && xhr.status < 300 && body.public_id) resolve(body.public_id);
          else reject(new Error("VIDEO_UPLOAD_FAILED"));
        } catch {
          reject(new Error("VIDEO_UPLOAD_FAILED"));
        }
      };
      xhr.onerror = () => reject(new Error("VIDEO_UPLOAD_FAILED"));
      xhr.onabort = () => reject(new Error("VIDEO_UPLOAD_ABORTED"));
      signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(form);
    });
    return apiClient.post<UploadedImage>("/media/videos", { publicId });
  },

  // ---------------- PRODUCTS ----------------
  async getProductCategories(): Promise<ProductCategory[]> {
    return apiClient.get<ProductCategory[]>("/products/categories");
  },

  async getProducts(params?: ProductSearchParams): Promise<Product[]> {
    let categoryId: string | undefined;
    if (params?.category) {
      const cats = await this.getProductCategories();
      const wanted = params.category.toLowerCase();
      categoryId = cats.find((c) => c.name.toLowerCase() === wanted || c.slug.toLowerCase() === wanted)?.id;
      if (!categoryId) return []; // unknown category → nothing matches
    }
    const res = await apiClient.get<RawProduct[]>(
      `/products${qs({ categoryId, search: params?.query, businessId: params?.businessId, city: params?.city, minPrice: params?.minPrice, maxPrice: params?.maxPrice, inStock: params?.inStock ? "true" : undefined, sort: params?.sort, lat: params?.lat, lng: params?.lng, radiusKm: params?.radiusKm })}`
    );
    const list = res.map(toProduct);
    return params?.limit ? list.slice(0, params.limit) : list;
  },

  /** Fire-and-forget: counts one view of the product page (the backend de-duplicates). */
  async recordProductView(productId: string): Promise<{ viewCount: number; counted: boolean }> {
    return apiClient.post(`/products/${productId}/view`, {});
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
    const { images, ...body } = input;
    const created = await apiClient.post<RawProduct>(`/businesses/${businessId}/products`, body);
    for (const [i, img] of (images ?? []).slice(0, 3).entries()) {
      await apiClient.post(`/products/${created.id}/images`, { url: img.url, mediaAssetId: img.id, sortOrder: i });
    }
    const full = await apiClient.get<RawProduct>(`/products/${created.id}`);
    return toProduct(full);
  },

  /** Owner view of one product (also inactive ones), with the text as typed available via sourceName/sourceDescription. */
  async getOwnerProduct(productId: string): Promise<Product | null> {
    const raw = await notFoundToNull(apiClient.get<RawProduct>(`/products/${productId}`));
    return raw ? toProduct(raw) : null;
  },

  async updateProduct(productId: string, input: UpdateProductInput): Promise<void> {
    await apiClient.patch(`/products/${productId}`, input);
  },

  async addProductImage(productId: string, img: UploadedImage, sortOrder: number): Promise<void> {
    await apiClient.post(`/products/${productId}/images`, { url: img.url, mediaAssetId: img.id, sortOrder });
  },

  async removeProductImage(productId: string, imageId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/images/${imageId}`);
  },

  async deleteProductVariant(productId: string, variantId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`);
  },

  async setProductActive(productId: string, active: boolean): Promise<void> {
    await apiClient.patch(`/products/${productId}`, { active });
  },

  async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete(`/products/${productId}`);
  },

  // ---------------- BUSINESSES ----------------
  async getBusinesses(params?: { query?: string; city?: string; limit?: number; sort?: string; lat?: number; lng?: number; radiusKm?: number }): Promise<Business[]> {
    const res = await apiClient.get<RawBusiness[]>(
      `/businesses${qs({ search: params?.query, city: params?.city, limit: params?.limit, sort: params?.sort, lat: params?.lat, lng: params?.lng, radiusKm: params?.radiusKm })}`
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

  async bookWorkshop(
    workshopId: string,
    quantity: number,
    opts?: { sessionId?: string; acceptMinAge?: boolean }
  ): Promise<WorkshopBooking & { requiresPayment: boolean }> {
    const raw = await apiClient.post<RawBooking & { requiresPayment?: boolean }>(`/workshops/${workshopId}/bookings`, {
      quantity,
      ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
      ...(opts?.acceptMinAge ? { acceptMinAge: true } : {}),
    });
    return { ...toBooking(raw), requiresPayment: raw.requiresPayment === true };
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
  async getShoproutes(params?: {
    city?: string;
    limit?: number;
    theme?: string;
    maxDistanceKm?: number;
    maxDurationMinutes?: number;
    sort?: "featured" | "newest" | "distance" | "duration";
  }): Promise<Shoproute[]> {
    const res = await apiClient.get<RawRoute[] | { data: RawRoute[] }>(
      `/shop-routes${qs({ city: params?.city, limit: params?.limit, theme: params?.theme, maxDistanceKm: params?.maxDistanceKm, maxDurationMinutes: params?.maxDurationMinutes, sort: params?.sort })}`
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
    const toLine = (i: RawCartItem): CartLine => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId ?? undefined,
      productName: i.product.name,
      imageUrl: i.product.images?.[0]?.mediaAsset?.url,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      total: i.total,
      variantLabel: [i.variant?.size, i.variant?.color].filter(Boolean).join(" / ") || undefined,
    });
    return {
      id: raw.id,
      business: raw.business,
      subtotal: raw.subtotal,
      deliveryFee: raw.deliveryFee,
      items: raw.items.map(toLine),
      groups: (raw.groups ?? []).map((g) => ({
        business: g.business,
        items: g.items.map(toLine),
        subtotal: g.subtotal,
        fulfilmentOptions: g.fulfilmentOptions,
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
  /**
   * Creates the checkout from the server-side cart (one order per store); totals and
   * fulfilment fees are computed by the backend. Nothing is paid yet: call createPaymentIntent next.
   */
  async createOrder(input: CreateOrderInput): Promise<CheckoutOrder> {
    const raw = await apiClient.post<{
      id: string;
      orderNumber: string;
      totalAmount: number | string;
      orders: RawOrder[];
    }>("/orders", input);
    return {
      id: raw.id,
      orderNumber: raw.orderNumber,
      totalAmount: Number(raw.totalAmount),
      orders: raw.orders.map(toOrder),
    };
  },

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    await apiClient.post(`/orders/${orderId}/cancel`, reason ? { reason } : {});
  },

  // ---------------- PAYMENTS ----------------
  /** Starts (or resumes) a hosted payment. Redirect the browser to `checkoutUrl`. */
  createPaymentIntent: (input: { purpose: PaymentIntent["purpose"]; relatedEntityId: string; method?: "IDEAL" | "CARD" | "PAYPAL" | "BANK_TRANSFER" }) =>
    apiClient.post<PaymentIntent>("/payments/intent", input),
  getPayment: (paymentId: string) => apiClient.get<PaymentInfo>(`/payments/${paymentId}`),

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

  // ---------------- GUEST CHECKOUT ----------------
  requestGuestOrderLink: (email: string, orderNumber: string) =>
    apiClient.post<{ message: string }>("/auth/guest/order-link", { email, orderNumber }),
  startGuestClaim: () => apiClient.post<{ message: string }>("/auth/guest/claim/start", {}),
  completeGuestClaim: (code: string, password: string) => apiClient.post<{ user: { id: string } }>("/auth/guest/claim/complete", { code, password }),

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

  async updateConsumerProfile(input: { displayName?: string; phone?: string; profileImageAssetId?: string | null }): Promise<ConsumerProfileInfo> {
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

  async cancelWorkshop(workshopId: string): Promise<void> {
    await apiClient.post(`/workshops/${workshopId}/cancel`, {});
  },

  async getBusinessBalance(businessId: string): Promise<BusinessBalance> {
    return apiClient.get<BusinessBalance>(`/businesses/${businessId}/balance`);
  },

  async getPayoutAccount(businessId: string): Promise<PayoutAccount> {
    return apiClient.get<PayoutAccount>(`/businesses/${businessId}/payout-account`);
  },
  async savePayoutAccount(businessId: string, input: { accountHolderName: string; iban: string; bankName?: string; bic?: string; country?: string }): Promise<PayoutAccount> {
    return apiClient.put<PayoutAccount>(`/businesses/${businessId}/payout-account`, input);
  },

  // ---- returns ----
  async createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>("/returns", input);
  },
  async getMyReturns(orderId?: string): Promise<ReturnRequest[]> {
    return apiClient.get<ReturnRequest[]>(`/returns${qs({ orderId })}`);
  },
  async cancelReturn(id: string): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/cancel`);
  },
  async getShopReturns(businessId: string, status?: ReturnStatus): Promise<ReturnRequest[]> {
    return apiClient.get<ReturnRequest[]>(`/businesses/${businessId}/returns${qs({ status })}`);
  },
  async decideReturn(id: string, decision: "APPROVE" | "REJECT", note?: string): Promise<ReturnRequest> {
    return apiClient.patch<ReturnRequest>(`/returns/${id}/decision`, { decision, note });
  },
  async receiveReturn(id: string, restock: boolean): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/received`, { restock });
  },
  async retryReturnRefund(id: string): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/retry-refund`);
  },

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    const raw = await apiClient.post<RawBusiness>("/businesses", input);
    return toBusiness(raw);
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return apiClient.get<NotificationPreferences>("/notifications/preferences");
  },

  async updateNotificationPreferences(input: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return apiClient.put<NotificationPreferences>("/notifications/preferences", input);
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
    const { sessions, ...rest } = input;
    const raw = await apiClient.post<RawWorkshop>("/workshops", {
      ...rest,
      sessions: sessions.map((s) => ({
        startTime: new Date(`${s.date}T${s.startTime}`).toISOString(),
        endTime: new Date(`${s.date}T${s.finishTime}`).toISOString(),
        ...(s.capacity ? { capacity: s.capacity } : {}),
      })),
    });
    return toWorkshop(raw);
  },

  async getWorkshopParticipants(
    workshopId: string,
    sessionId?: string
  ): Promise<{ title: string; minAge?: number; data: WorkshopParticipant[] }> {
    const res = await apiClient.get<{
      workshop: { title: string; minAge?: number | null };
      data: WorkshopParticipant[];
    }>(`/workshops/${workshopId}/participants${qs({ sessionId })}`);
    return { title: res.workshop.title, minAge: res.workshop.minAge ?? undefined, data: res.data };
  },

  async cancelWorkshopSession(workshopId: string, sessionId: string): Promise<void> {
    await apiClient.post(`/workshops/${workshopId}/sessions/${sessionId}/cancel`, {});
  },

  async addWorkshopSession(workshopId: string, s: WorkshopSessionInput): Promise<WorkshopSession> {
    const raw = await apiClient.post<RawWorkshopSession>(`/workshops/${workshopId}/sessions`, {
      startTime: new Date(`${s.date}T${s.startTime}`).toISOString(),
      endTime: new Date(`${s.date}T${s.finishTime}`).toISOString(),
      ...(s.capacity ? { capacity: s.capacity } : {}),
    });
    return toWorkshopSession(raw);
  },

  async getBusinessWorkshops(businessId: string): Promise<Workshop[]> {
    const res = await apiClient.get<RawWorkshop[] | { data: RawWorkshop[] }>(
      `/businesses/${businessId}/workshops?limit=100`
    );
    return unwrap(res).map(toWorkshop);
  },

  /** Owner view: includes drafts. */
  async getBusinessShoproutes(businessId: string): Promise<Shoproute[]> {
    const res = await apiClient.get<RawRoute[] | { data: RawRoute[] }>(
      `/businesses/${businessId}/shop-routes?limit=100`
    );
    return unwrap(res).map(toShoproute);
  },

  async createShoproute(input: CreateShoprouteInput): Promise<Shoproute> {
    const raw = await apiClient.post<RawRoute>("/shop-routes", input);
    return toShoproute(raw);
  },

  async setShoprouteStatus(routeId: string, status: "PUBLISHED" | "DRAFT"): Promise<void> {
    await apiClient.patch(`/shop-routes/${routeId}`, { status });
  },

  async deleteShoproute(routeId: string): Promise<void> {
    await apiClient.delete(`/shop-routes/${routeId}`);
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

  // ---------------- FAVORITES ----------------
  async getFavoriteIds(): Promise<{ productIds: string[]; businessIds: string[] }> {
    return apiClient.get("/favorites/ids");
  },

  async setFavorite(target: "product" | "business", id: string, on: boolean): Promise<void> {
    const path = `/favorites/${target === "product" ? "products" : "businesses"}/${id}`;
    if (on) await apiClient.put(path, {});
    else await apiClient.delete(path);
  },

  async getFavorites(): Promise<{ products: Product[]; businesses: Business[] }> {
    const res = await apiClient.get<{ products: RawProduct[]; businesses: RawBusiness[] }>("/favorites");
    return { products: res.products.map(toProduct), businesses: res.businesses.map(toBusiness) };
  },

  // ---------------- CHAT ----------------
  async startConversation(businessId: string): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>("/conversations", { businessId });
  },
  /** Own conversations; with `shopId` the inbox of a shop the user owns or works for. */
  async getConversations(shopId?: string): Promise<ChatConversation[]> {
    return apiClient.get<ChatConversation[]>(`/conversations${qs({ businessId: shopId })}`);
  },
  async getChatThread(conversationId: string): Promise<ChatThread> {
    return apiClient.get<ChatThread>(`/conversations/${conversationId}/messages`);
  },
  async sendChatMessage(conversationId: string, body: string): Promise<ChatMessage> {
    return apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, { body });
  },
  async sendChatImage(conversationId: string, file: File, body?: string): Promise<ChatMessage> {
    const form = new FormData();
    form.append("file", file);
    if (body?.trim()) form.append("body", body.trim());
    return apiClient.post<ChatMessage>(`/conversations/${conversationId}/attachments`, form);
  },
  async setChatBlocked(conversationId: string, blocked: boolean): Promise<void> {
    await apiClient.put(`/conversations/${conversationId}/block`, { blocked });
  },
  async reportChat(
    conversationId: string,
    input: { messageId?: string; reason: ChatReportReason; details?: string }
  ): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/reports`, input);
  },
  async markChatRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/read`);
  },
  async getChatUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ unreadCount: number }>("/conversations/unread-count");
    return res.unreadCount;
  },

  // ---------------- EMPLOYEES ----------------
  async getEmployees(businessId: string): Promise<Employee[]> {
    return apiClient.get<Employee[]>(`/businesses/${businessId}/employees`);
  },
  async inviteEmployee(businessId: string, email: string, role: "MANAGER" | "STAFF"): Promise<void> {
    await apiClient.post(`/businesses/${businessId}/employees`, { email, role });
  },
  async revokeEmployee(businessId: string, employeeId: string): Promise<void> {
    await apiClient.delete(`/businesses/${businessId}/employees/${employeeId}`);
  },
  async acceptEmployeeInvite(token: string): Promise<{ businessId: string; businessName: string }> {
    return apiClient.post(`/staff/accept`, { token });
  },
  async getStaffShops(): Promise<StaffShop[]> {
    return apiClient.get<StaffShop[]>(`/staff/shops`);
  },

  // ---------------- PRIVACY ----------------
  async deleteMyAccount(confirm: string, password?: string): Promise<void> {
    await apiClient.post(`/account/delete`, { confirm, ...(password ? { password } : {}) });
  },

  // ---------------- NOTIFICATIONS ----------------
  async getNotifications(includeRead = false): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    return apiClient.get(`/notifications${qs({ includeRead: includeRead ? "true" : undefined })}`);
  },
  async markNotificationRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`, { markAsRead: true });
  },
  async markAllNotificationsRead(): Promise<void> {
    await apiClient.post("/notifications/read-all");
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
