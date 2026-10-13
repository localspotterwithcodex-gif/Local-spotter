import { MOCK_PRODUCTS, MOCK_PRODUCT_CATEGORIES } from "@/data/mock/products";
import { MOCK_BUSINESSES } from "@/data/mock/businesses";
import { MOCK_WORKSHOPS } from "@/data/mock/workshops";
import { MOCK_SHOPROUTES } from "@/data/mock/shoproutes";
import { MOCK_ORDERS } from "@/data/mock/orders";
import { MOCK_REVIEWS } from "@/data/mock/reviews";
import { MOCK_SUBSCRIPTION_PLANS } from "@/data/mock/subscriptions";
import { Product } from "@/types/product";
import { Business } from "@/types/business";
import { Workshop, WorkshopBooking } from "@/types/workshop";
import { Shoproute } from "@/types/shoproute";
import { Order, OrderStatus } from "@/types/order";
import { Review } from "@/types/review";
import { SubscriptionPlan } from "@/types/subscription";

// Helper for simulated network delay
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  // PRODUCTS
  async getProducts(params?: { category?: string; query?: string; businessId?: string; limit?: number }) {
    await delay();
    let result = [...MOCK_PRODUCTS];
    if (params?.category) {
      result = result.filter((p) => p.category.toLowerCase() === params.category?.toLowerCase());
    }
    if (params?.businessId) {
      result = result.filter((p) => p.businessId === params.businessId);
    }
    if (params?.query) {
      const q = params.query.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    return result;
  },

  async getProductById(id: string) {
    await delay();
    return MOCK_PRODUCTS.find((p) => p.id === id) || null;
  },

  async getProductCategories() {
    await delay();
    return MOCK_PRODUCT_CATEGORIES;
  },

  async createProduct(data: Partial<Product>) {
    await delay(300);
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      businessId: data.businessId || "bus-1",
      businessName: data.businessName || "Mijn Winkel",
      name: data.name || "Nieuw Product",
      price: data.price || 0,
      compareAtPrice: data.compareAtPrice,
      description: data.description || "",
      images: data.images || [],
      category: data.category || "General",
      stock: data.stock || 1,
      rating: 5.0,
      reviewCount: 0,
      likeCount: 0,
      viewCount: 1,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    MOCK_PRODUCTS.unshift(newProduct);
    return newProduct;
  },

  // BUSINESSES
  async getBusinesses(params?: { query?: string; city?: string; limit?: number }) {
    await delay();
    let result = [...MOCK_BUSINESSES];
    if (params?.query) {
      const q = params.query.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    }
    if (params?.city) {
      result = result.filter((b) => b.location.city.toLowerCase() === params.city?.toLowerCase());
    }
    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    return result;
  },

  async getBusinessById(id: string) {
    await delay();
    return MOCK_BUSINESSES.find((b) => b.id === id) || null;
  },

  // WORKSHOPS
  async getWorkshops(params?: { limit?: number; businessId?: string }) {
    await delay();
    let result = [...MOCK_WORKSHOPS];
    if (params?.businessId) {
      result = result.filter((w) => w.businessId === params.businessId);
    }
    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    return result;
  },

  async getWorkshopById(id: string) {
    await delay();
    return MOCK_WORKSHOPS.find((w) => w.id === id) || null;
  },

  async bookWorkshop(workshopId: string, quantity: number) {
    await delay(300);
    const workshop = MOCK_WORKSHOPS.find((w) => w.id === workshopId);
    if (!workshop) throw new Error("Workshop not found");
    if (workshop.bookedCount + quantity > workshop.capacity) {
      throw new Error("Niet genoeg capaciteit beschikbaar");
    }
    workshop.bookedCount += quantity;
    const booking: WorkshopBooking = {
      id: `bk-${Date.now()}`,
      workshopId,
      workshopTitle: workshop.title,
      consumerId: "cons-1",
      consumerName: "Sanne de Jong",
      ticketQuantity: quantity,
      totalAmount: workshop.price * quantity,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };
    return booking;
  },

  // SHOPROUTES
  async getShoproutes(params?: { city?: string; limit?: number }) {
    await delay();
    let result = [...MOCK_SHOPROUTES];
    if (params?.city) {
      result = result.filter((r) => r.cityName.toLowerCase() === params.city?.toLowerCase());
    }
    if (params?.limit) {
      result = result.slice(0, params.limit);
    }
    return result;
  },

  async getShoprouteById(id: string) {
    await delay();
    return MOCK_SHOPROUTES.find((r) => r.id === id) || null;
  },

  // ORDERS
  async getOrders(params?: { businessId?: string; consumerId?: string }) {
    await delay();
    let result = [...MOCK_ORDERS];
    if (params?.businessId) {
      result = result.filter((o) => o.businessId === params.businessId);
    }
    if (params?.consumerId) {
      result = result.filter((o) => o.consumerId === params.consumerId);
    }
    return result;
  },

  async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    await delay(200);
    const order = MOCK_ORDERS.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    return order;
  },

  // REVIEWS
  async getReviews(params?: { businessId?: string; productId?: string }) {
    await delay();
    let result = [...MOCK_REVIEWS];
    if (params?.businessId) {
      result = result.filter((r) => r.businessId === params.businessId);
    }
    if (params?.productId) {
      result = result.filter((r) => r.productId === params.productId);
    }
    return result;
  },

  // SUBSCRIPTION PLANS
  async getSubscriptionPlans() {
    await delay();
    return MOCK_SUBSCRIPTION_PLANS;
  },
};
