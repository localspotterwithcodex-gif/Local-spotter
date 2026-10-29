/**
 * Super-admin API. Every method is a real request to `/api/v1/admin/*`
 * (guarded by JwtAuthGuard + RolesGuard(SUPER_ADMIN) on the backend).
 * The backend wraps payloads as `{ data: ... }`; mappers here convert the raw
 * Prisma JSON (Decimal strings, ISO dates) into small view-model types.
 */
import { apiClient, ApiError, qs } from "./client";
import type { ReturnRequest } from "./index";
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
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AdminBusiness {
  id: string;
  name: string;
  logoUrl: string | null;
  ownerName: string;
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

export interface AdminRoute {
  id: string;
  title: string;
  city: string;
  businessName: string;
  status: string;
  featured: boolean;
  stopCount: number;
  distanceKm?: number;
}

export interface AdminWorkshop {
  id: string;
  title: string;
  businessName: string;
  status: string;
  startTime: string;
  capacity: number;
  bookedCount: number;
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
  accountHolder: string;
  /** Weekly run key (e.g. 2026-W43); empty for older payouts. */
  periodKey: string | null;
  providerReference: string | null;
  adminNotes: string | null;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
}

export interface AdminPlanCommission {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  commissionBps: number | null;
  active: boolean;
  description?: string;
}

export interface PlanEditInput {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  active?: boolean;
}

export interface AnalyticsKpi {
  value: number;
  deltaPct: number | null;
}
export interface AdminAnalytics {
  period: { days: number; from: string; to: string };
  regions: string[];
  kpis: {
    totalUsers: AnalyticsKpi;
    activeShops: AnalyticsKpi;
    totalOrders: AnalyticsKpi;
    grossRevenue: AnalyticsKpi;
    conversionRate: AnalyticsKpi;
    averageOrderValue: AnalyticsKpi;
  };
  trend: { date: string; revenue: number; orders: number }[];
  revenueByCategory: { name: string; revenue: number; share: number }[];
  shopGrowth: { date: string; newShops: number; activeShops: number }[];
  userDistribution: { role: UserRole; count: number; share: number }[];
  topShops: { id: string; name: string; logoUrl: string | null; orders: number; revenue: number; growthPct: number | null }[];
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
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}
interface RawBusiness {
  id: string;
  name: string;
  logoAsset?: { url: string } | null;
  ownerProfile?: { displayName: string | null } | null;
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
  description?: string | null;
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
  accountHolder?: string | null;
  periodKey?: string | null;
  providerReference?: string | null;
  adminNotes?: string | null;
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
  avatarUrl: r.avatarUrl ?? null,
  role: r.role,
  status: r.status,
  createdAt: r.createdAt,
});
const toBusiness = (r: RawBusiness): AdminBusiness => ({
  id: r.id,
  name: r.name,
  logoUrl: r.logoAsset?.url ?? null,
  ownerName: r.ownerProfile?.displayName ?? DASH,
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
/** Label fixed at payment time (`description`); older rows fall back to what is linked to them today. */
function paymentType(r: RawPayment): string {
  const d = r.description?.replace(/^LocalSpotter\s+/, "").trim();
  if (r.purpose === "BUSINESS_SUBSCRIPTION") {
    const plan = d || r.businessSubscription?.plan?.name;
    return plan ? `Subscription (${plan})` : "Subscription";
  }
  if (r.purpose === "WORKSHOP_BOOKING") return d || "Workshop booking";
  if (r.order) return `Order #${r.order.orderNumber}`;
  return d || r.purpose;
}
const toPayment = (r: RawPayment): AdminPayment => ({
  id: r.id,
  businessName: r.business?.name ?? DASH,
  type: paymentType(r),
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
  accountHolder: r.accountHolder ?? DASH,
  periodKey: r.periodKey ?? null,
  providerReference: r.providerReference ?? null,
  adminNotes: r.adminNotes ?? null,
  amount: num(r.amount),
  status: r.status,
  createdAt: r.createdAt,
});

export type CategoryKind = "business" | "product";
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  usage: number;
}
export interface TranslationStatus {
  configured: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
}

export interface AdminChatReport {
  id: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  reason: "SPAM" | "HARASSMENT" | "FRAUD" | "INAPPROPRIATE" | "OTHER";
  details: string | null;
  messageSnapshot: string | null;
  createdAt: string;
  reporterEmail: string | null;
  businessName: string;
  consumerName: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface PaymentDiagnosis {
  configured: boolean;
  keyKind: string;
  frontendUrl: string;
  frontendUrlValid: boolean;
  ok: boolean;
  httpStatus: number | null;
  code: string | null;
  param: string | null;
  message: string | null;
  hint: string;
}

export const adminApi = {
  async checkPaymentSetup(): Promise<PaymentDiagnosis> {
    const res = await apiClient.get<Envelope<PaymentDiagnosis>>("/admin/payment-diagnostics");
    return res.data;
  },

  async getAnalytics(q: { days?: number; region?: string; categoryId?: string } = {}): Promise<AdminAnalytics> {
    const res = await apiClient.get<Envelope<AdminAnalytics>>(`/admin/analytics${qs({ days: q.days, region: q.region, categoryId: q.categoryId })}`);
    return res.data;
  },

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

  async getBusinesses(q: PageQuery & { search?: string; status?: BusinessStatus; categoryId?: string; plan?: string } = {}): Promise<Paged<AdminBusiness>> {
    const res = await apiClient.get<Envelope<{ businesses: RawBusiness[]; meta: PageMeta }>>(
      `/admin/businesses${qs({ search: q.search, status: q.status, categoryId: q.categoryId, plan: q.plan, limit: q.limit, offset: q.offset })}`
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

  async getRoutes(q: PageQuery & { search?: string } = {}): Promise<Paged<AdminRoute>> {
    type RawAdminRoute = { id: string; title: string; city: string; status: string; featured: boolean; distanceKm?: number | string | null; business?: { name: string } | null; _count?: { stops: number } };
    const res = await apiClient.get<Envelope<{ routes: RawAdminRoute[]; meta: PageMeta }>>(
      `/admin/shop-routes${qs({ search: q.search, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.routes, res.data.meta, (r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      businessName: r.business?.name ?? "—",
      status: r.status,
      featured: r.featured,
      stopCount: r._count?.stops ?? 0,
      distanceKm: r.distanceKm == null ? undefined : Number(r.distanceKm),
    }));
  },
  async moderateRoute(id: string, input: { status?: "PUBLISHED" | "DRAFT" | "ARCHIVED"; featured?: boolean }): Promise<void> {
    await apiClient.patch(`/admin/shop-routes/${id}/moderation`, input);
  },

  async getChatReports(status: "OPEN" | "RESOLVED" | "DISMISSED" = "OPEN"): Promise<AdminChatReport[]> {
    return apiClient.get<AdminChatReport[]>(`/admin/chat-reports${qs({ status })}`);
  },
  async resolveChatReport(id: string, status: "RESOLVED" | "DISMISSED", note?: string): Promise<void> {
    await apiClient.post(`/admin/chat-reports/${id}/resolve`, { status, note: note?.trim() || undefined });
  },

  async getCategories(kind: CategoryKind): Promise<AdminCategory[]> {
    return apiClient.get<AdminCategory[]>(`/admin/categories/${kind}`);
  },
  async createCategory(kind: CategoryKind, input: { name: string; description?: string; sortOrder?: number }): Promise<void> {
    await apiClient.post(`/admin/categories/${kind}`, input);
  },
  async updateCategory(kind: CategoryKind, id: string, input: { name?: string; description?: string; sortOrder?: number; active?: boolean }): Promise<void> {
    await apiClient.patch(`/admin/categories/${kind}/${id}`, input);
  },
  async deleteCategory(kind: CategoryKind, id: string): Promise<void> {
    await apiClient.delete(`/admin/categories/${kind}/${id}`);
  },
  async getTranslationStatus(): Promise<TranslationStatus> {
    return apiClient.get<TranslationStatus>(`/admin/translation/status`);
  },

  async getWorkshops(q: PageQuery & { search?: string } = {}): Promise<Paged<AdminWorkshop>> {
    type RawAdminWorkshop = { id: string; title: string; status: string; startTime: string; capacity: number; bookedCount: number; business?: { name: string } | null };
    const res = await apiClient.get<Envelope<{ workshops: RawAdminWorkshop[]; meta: PageMeta }>>(
      `/admin/workshops${qs({ search: q.search, limit: q.limit, offset: q.offset })}`
    );
    return paged(res.data.workshops, res.data.meta, (w) => ({
      id: w.id,
      title: w.title,
      businessName: w.business?.name ?? "—",
      status: w.status,
      startTime: w.startTime,
      capacity: w.capacity,
      bookedCount: w.bookedCount,
    }));
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

  async getOrders(q: PageQuery & { status?: OrderStatus; search?: string } = {}): Promise<Paged<AdminOrder>> {
    const res = await apiClient.get<Envelope<{ orders: RawOrder[]; meta: PageMeta }>>(
      `/admin/orders${qs({ status: q.status, search: q.search, limit: q.limit, offset: q.offset })}`
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
  async rejectPayout(id: string, reason: string, status: "REJECTED" | "FAILED" = "REJECTED"): Promise<void> {
    await apiClient.patch(`/admin/payouts/${id}/reject`, { status, reason });
  },
  async markPayoutPaid(id: string, providerReference: string): Promise<void> {
    await apiClient.patch(`/admin/payouts/${id}/paid`, { providerReference });
  },
  async runPayouts(): Promise<{ periodKey: string; created: number; alreadyExists: number; belowMinimum: number; failed: number }> {
    return apiClient.post("/admin/payouts/run");
  },
  /** CSV with the IBANs of open payouts for the bank batch (audited server-side). */
  async exportPayoutsCsv(): Promise<string> {
    const res = await fetch("/api/v1/admin/payouts/export", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError((body && body.message) || res.statusText || "Request failed", res.status, body);
    }
    return res.text();
  },
  async getPlanCommissions(): Promise<{ defaultBps: number; plans: AdminPlanCommission[] }> {
    return apiClient.get("/admin/plans");
  },
  async updatePlan(planId: string, input: PlanEditInput): Promise<{ id: string; slug: string; name: string; description: string; monthlyPrice: number; active: boolean }> {
    return apiClient.patch(`/admin/plans/${planId}`, input);
  },
  async setPlanCommission(planId: string, commissionBps: number | null): Promise<void> {
    await apiClient.patch(`/admin/plans/${planId}/commission`, { commissionBps });
  },
  async getReturns(status?: string): Promise<ReturnRequest[]> {
    return apiClient.get(`/admin/returns${qs({ status })}`);
  },
};
