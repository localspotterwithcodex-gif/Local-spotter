/**
 * Super-admin API. Every method is a real request to `/api/v1/admin/*`
 * (guarded by JwtAuthGuard + RolesGuard(SUPER_ADMIN) on the backend).
 * The backend wraps payloads as `{ data: ... }`; mappers here convert the raw
 * Prisma JSON (Decimal strings, ISO dates) into small view-model types.
 */
import { apiClient, qs } from "./client";
import { num } from "./mappers";
import type { OrderStatus } from "@/types/order";

type Dec = string | number | null | undefined;
interface Envelope<T> {
  data: T;
}
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}
export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}
export interface PageQuery {
  limit?: number;
  offset?: number;
}

export type BusinessStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export type UserRole = "CONSUMER" | "BUSINESS_OWNER" | "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "DELETED";
export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
export type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "FAILED";

// ---- view models ----
export interface AdminDashboard {
  users: { total: number; consumers: number; businessOwners: number };
  businesses: { total: number; active: number; pending: number; suspended: number };
  subscriptions: { active: number };
  orders: { total: number };
  products: { total: number };
  reviews: { total: number; pending: number };
  revenue: number;
  pendingPayouts: number;
  reportedContent: number;
  failedWebhooks: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AdminBusiness {
  id: string;
  name: string;
  category: string;
  kvkNumber: string;
  city: string;
  planName: string;
  status: BusinessStatus;
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  businessName: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
  imageUrl: string;
}

export interface AdminReview {
  id: string;
  consumerName: string;
  businessName: string;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  consumerName: string;
  businessName: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  businessName: string;
  type: string;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  businessName: string;
  planName: string;
  planPrice: number;
  status: string;
}

export interface AdminPayout {
  id: string;
  businessName: string;
  iban: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
}

export interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPrice: number;
}

// ---- raw shapes (only fields we read) ----
interface RawUser {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}
interface RawBusiness {
  id: string;
  name: string;
  kvkNumber: string;
  city: string;
  status: BusinessStatus;
  createdAt: string;
  category?: { name: string } | null;
  subscription?: { status: string; plan?: { name: string } | null } | null;
}
interface RawProduct {
  id: string;
  name: string;
  price: Dec;
  stock: number;
  active: boolean;
  business?: { name: string } | null;
  category?: { name: string } | null;
  images?: { mediaAsset?: { url: string } | null }[];
}
interface RawReview {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  business?: { name: string } | null;
  consumerProfile?: { displayName: string | null } | null;
}
interface RawOrder {
  id: string;
  orderNumber: string;
  totalAmount: Dec;
  status: OrderStatus;
  createdAt: string;
  business?: { name: string } | null;
  consumerProfile?: { displayName: string | null } | null;
}
interface RawPayment {
  id: string;
  purpose: string;
  method?: string | null;
  provider: string;
  status: string;
  amount: Dec;
  createdAt: string;
  order?: { orderNumber: string } | null;
  businessSubscription?: { plan?: { name: string } | null } | null;
  business?: { name: string } | null;
}
interface RawSubscription {
  id: string;
  status: string;
  business?: { name: string } | null;
  plan?: { name: string; monthlyPrice: Dec } | null;
}
interface RawPayout {
  id: string;
  amount: Dec;
  status: PayoutStatus;
  iban?: string | null;
  createdAt: string;
  business?: { name: string } | null;
}
interface RawPlan {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  monthlyPrice: Dec;
}

const DASH = "-";
const page = (q?: PageQuery) => qs({ limit: q?.limit, offset: q?.offset });

function paged<T, R>(raw: R[], meta: PageMeta, map: (r: R) => T): Paged<T> {
  return { items: raw.map(map), meta };
}

const toUser = (r: RawUser): AdminUser => ({
  id: r.id,
  email: r.email ?? DASH,
  displayName: r.displayName ?? DASH,
  role: r.role,
  status: r.status,
  createdAt: r.createdAt,
});
const toBusiness = (r: RawBusiness): AdminBusiness => ({
  id: r.id,
  name: r.name,
  category: r.category?.name ?? DASH,
  kvkNumber: r.kvkNumber,
  city: r.city,
  planName: r.subscription?.plan?.name ?? DASH,
  status: r.status,
  createdAt: r.createdAt,
});
const toProduct = (r: RawProduct): AdminProduct => ({
  id: r.id,
  name: r.name,
  businessName: r.business?.name ?? DASH,
  category: r.category?.name ?? DASH,
  price: num(r.price),
  stock: r.stock,
  active: r.active,
  imageUrl: r.images?.[0]?.mediaAsset?.url ?? "",
});
const toReview = (r: RawReview): AdminReview => ({
  id: r.id,
  consumerName: r.consumerProfile?.displayName ?? DASH,
  businessName: r.business?.name ?? DASH,
  rating: r.rating,
  title: r.title ?? "",
  comment: r.comment,
  status: r.status,
  createdAt: r.createdAt,
});
const toOrder = (r: RawOrder): AdminOrder => ({
  id: r.id,
  orderNumber: r.orderNumber,
  consumerName: r.consumerProfile?.displayName ?? DASH,
  businessName: r.business?.name ?? DASH,
  total: num(r.totalAmount),
  status: r.status,
  createdAt: r.createdAt,
});
const toPayment = (r: RawPayment): AdminPayment => ({
  id: r.id,
  businessName: r.business?.name ?? DASH,
  type: r.order
    ? `Order #${r.order.orderNumber}`
    : r.businessSubscription?.plan
      ? `Subscription (${r.businessSubscription.plan.name})`
      : r.purpose,
  method: r.method ?? r.provider,
  amount: num(r.amount),
  status: r.status,
  createdAt: r.createdAt,
});
const toSubscription = (r: RawSubscription): AdminSubscription => ({
  id: r.id,
  businessName: r.business?.name ?? DASH,
  planName: r.plan?.name ?? DASH,
  planPrice: num(r.plan?.monthlyPrice),
  status: r.status,
});
const toPayout = (r: RawPayout): AdminPayout => ({
  id: r.id,
  businessName: r.business?.name ?? DASH,
  iban: r.iban ?? DASH,
  amount: num(r.amount),
  status: r.status,
  createdAt: r.createdAt,
});

export const adminApi = {
  async getDashboard(range?: { startDate?: string; endDate?: string }): Promise<AdminDashboard> {
    const res = await apiClient.get<Envelope<AdminDashboard>>(`/admin/dashboard${qs(range)}`);
    return res.data;
  },

  async getUsers(q: PageQuery & { search?: string; role?: UserRole; status?: UserStatus } = {}): Promise<Paged<AdminUser>> {
    const res = await apiClient.get<Envelope<{ users: RawUser[]; meta: PageMeta }>>(
      `/admin/users${qs({ search: q.search, role: q.role, status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.users, res.data.meta, toUser);
  },
  async setUserStatus(id: string, status: UserStatus): Promise<void> {
    await apiClient.patch(`/admin/users/${id}/status`, { status });
  },

  async getBusinesses(q: PageQuery & { search?: string; status?: BusinessStatus } = {}): Promise<Paged<AdminBusiness>> {
    const res = await apiClient.get<Envelope<{ businesses: RawBusiness[]; meta: PageMeta }>>(
      `/admin/businesses${qs({ search: q.search, status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.businesses, res.data.meta, toBusiness);
  },
  async setBusinessStatus(id: string, status: BusinessStatus): Promise<void> {
    await apiClient.patch(`/admin/businesses/${id}/status`, { status });
  },

  async getProducts(q: PageQuery & { search?: string; active?: boolean } = {}): Promise<Paged<AdminProduct>> {
    const res = await apiClient.get<Envelope<{ products: RawProduct[]; meta: PageMeta }>>(
      `/admin/products${qs({ search: q.search, active: q.active, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.products, res.data.meta, toProduct);
  },
  async setProductActive(id: string, active: boolean): Promise<void> {
    await apiClient.patch(`/admin/products/${id}/moderation`, { active });
  },

  async getReviews(q: PageQuery & { status?: ReviewStatus } = {}): Promise<Paged<AdminReview>> {
    const res = await apiClient.get<Envelope<{ reviews: RawReview[]; meta: PageMeta }>>(
      `/admin/reviews${qs({ status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.reviews, res.data.meta, toReview);
  },
  async moderateReview(id: string, status: ReviewStatus): Promise<void> {
    await apiClient.patch(`/admin/reviews/${id}/moderation`, { status });
  },

  async getOrders(q: PageQuery & { status?: OrderStatus } = {}): Promise<Paged<AdminOrder>> {
    const res = await apiClient.get<Envelope<{ orders: RawOrder[]; meta: PageMeta }>>(
      `/admin/orders${qs({ status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.orders, res.data.meta, toOrder);
  },
  async setOrderStatus(id: string, status: OrderStatus, reason: string): Promise<void> {
    await apiClient.patch(`/admin/orders/${id}/status`, { status, reason });
  },

  async getPayments(q: PageQuery = {}): Promise<Paged<AdminPayment>> {
    const res = await apiClient.get<Envelope<{ payments: RawPayment[]; meta: PageMeta }>>(`/admin/payments${page(q)}`);
    return paged(res.data.payments, res.data.meta, toPayment);
  },

  async getSubscriptions(q: PageQuery & { status?: string } = {}): Promise<Paged<AdminSubscription>> {
    const res = await apiClient.get<Envelope<{ subscriptions: RawSubscription[]; meta: PageMeta }>>(
      `/admin/subscriptions${qs({ status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.subscriptions, res.data.meta, toSubscription);
  },
  /** Public plan catalogue (name, price, description) shown on the admin subscriptions page. */
  async getPlans(): Promise<AdminPlan[]> {
    const res = await apiClient.get<RawPlan[] | Envelope<RawPlan[]>>("/subscriptions/plans");
    const raw = Array.isArray(res) ? res : res.data;
    return raw.map((p) => ({ id: p.id, slug: String(p.slug ?? "").toLowerCase(), name: p.name, description: p.description ?? "", monthlyPrice: num(p.monthlyPrice) }));
  },

  async getPayouts(q: PageQuery & { status?: PayoutStatus } = {}): Promise<Paged<AdminPayout>> {
    const res = await apiClient.get<Envelope<{ payouts: RawPayout[]; meta: PageMeta }>>(
      `/admin/payouts${qs({ status: q.status, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.payouts, res.data.meta, toPayout);
  },
  async approvePayout(id: string): Promise<void> {
    await apiClient.patch(`/admin/payouts/${id}/approve`);
  },
  async rejectPayout(id: string, reason: string): Promise<void> {
    await apiClient.patch(`/admin/payouts/${id}/reject`, { reason });
  },
};
