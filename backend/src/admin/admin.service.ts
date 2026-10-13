import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus, BusinessStatus, ReviewStatus, OrderStatus, PaymentStatus, SubscriptionStatus, PayoutStatus, Product, Order, Payment, BusinessSubscription, BusinessLedgerEntry } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(query: { startDate?: string; endDate?: string }) {
    const where = this.buildDateWhere(query);

    const [
      totalUsers,
      totalConsumers,
      totalBusinessOwners,
      totalBusinesses,
      activeBusinesses,
      pendingBusinesses,
      suspendedBusinesses,
      activeSubscriptions,
      totalOrders,
      totalProducts,
      totalWorkshops,
      totalBookings,
      totalReviews,
      pendingReviews,
      revenue,
      pendingPayouts,
      reportedContent,
      failedWebhooks,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.CONSUMER } }),
      this.prisma.user.count({ where: { role: UserRole.BUSINESS_OWNER } }),
      this.prisma.business.count({ where: { deletedAt: null } }),
      this.prisma.business.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.business.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
      this.prisma.business.count({ where: { status: 'SUSPENDED', deletedAt: null } }),
      this.prisma.businessSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({ where }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.workshop.count({ where }),
      this.prisma.workshopBooking.count({ where }),
      this.prisma.review.count({ where }),
      this.prisma.review.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', ...where },
        _sum: { amount: true },
      }),
      this.prisma.payout.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.paymentWebhookEvent.count({ where: { processed: false } }),
    ]);

    return {
      data: {
        users: { total: totalUsers, consumers: totalConsumers, businessOwners: totalBusinessOwners },
        businesses: { total: totalBusinesses, active: activeBusinesses, pending: pendingBusinesses, suspended: suspendedBusinesses },
        subscriptions: { active: activeSubscriptions },
        orders: { total: totalOrders },
        products: { total: totalProducts },
        workshops: { total: totalWorkshops },
        bookings: { total: totalBookings },
        reviews: { total: totalReviews, pending: pendingReviews },
        revenue: Number(revenue._sum.amount || 0),
        pendingPayouts,
        reportedContent,
        failedWebhooks,
      },
    };
  }

  async getUsers(query: { search?: string; role?: UserRole; status?: UserStatus; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [{ email: { contains: query.search, mode: 'insensitive' as any } }];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const } }),
      this.prisma.user.count({ where }),
    ]);

    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        const consumerProfile = await this.prisma.consumerProfile.findUnique({
          where: { userId: user.id },
          select: { displayName: true, firstName: true, lastName: true },
        });
        const businessOwnerProfile = await this.prisma.businessOwnerProfile.findUnique({
          where: { userId: user.id },
          select: { displayName: true },
        });
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          displayName: consumerProfile?.displayName || businessOwnerProfile?.displayName || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }),
    );

    return { data: { users: formattedUsers, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [consumerProfile, businessOwnerProfile, orders, businesses] = await Promise.all([
      this.prisma.consumerProfile.findUnique({ where: { userId: user.id }, select: { id: true, displayName: true, firstName: true, lastName: true, phone: true, createdAt: true } }),
      this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id }, select: { id: true, displayName: true, phone: true, createdAt: true } }),
      this.prisma.order.findMany({ where: { consumerProfileId: user.id }, select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true } }),
      user.role === UserRole.BUSINESS_OWNER
        ? this.prisma.business.findMany({ where: { ownerProfileId: user.id }, select: { id: true, name: true, status: true, createdAt: true } })
        : Promise.resolve([]),
    ]);

    return {
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        displayName: consumerProfile?.displayName || businessOwnerProfile?.displayName || null,
        firstName: consumerProfile?.firstName || null,
        lastName: consumerProfile?.lastName || null,
        phone: consumerProfile?.phone || businessOwnerProfile?.phone || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        orders,
        businesses,
        orderCount: orders.length,
        businessCount: businesses.length,
      },
    };
  }

  async updateUserStatus(userId: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === status) {
      return { data: { message: 'User status unchanged', user: { id: user.id, status: user.status } } };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getUserOrders(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let whereClause: Record<string, any>;
    if (user.role === UserRole.CONSUMER) {
      whereClause = { consumerProfileId: userId };
    } else {
      const businessIds = (await this.prisma.business.findMany({
        where: { ownerProfileId: userId },
        select: { id: true },
      })).map((b) => b.id);
      whereClause = { businessId: { in: businessIds } };
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        consumerProfile: { select: { displayName: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { orders } };
  }

  async getUserBusinesses(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.CONSUMER) {
      return { data: { businesses: [] } };
    }

    const businesses = await this.prisma.business.findMany({
      where: { ownerProfileId: userId },
      include: {
        category: { select: { name: true } },
        subscription: { select: { status: true, plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { businesses } };
  }

  async getBusinesses(query: { search?: string; status?: string; categoryId?: string; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = { deletedAt: null };
    if (query.status) {
      where.status = query.status;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' as any } },
        { slug: { contains: query.search, mode: 'insensitive' as any } },
      ];
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const }, include: { ownerProfile: { select: { displayName: true } }, category: { select: { name: true } }, subscription: { select: { status: true, plan: { select: { name: true } } } } } }),
      this.prisma.business.count({ where }),
    ]);

    return { data: { businesses, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        ownerProfile: { select: { displayName: true, phone: true } },
        category: { select: { name: true } },
        subscription: { select: { status: true, currentPeriodStart: true, currentPeriodEnd: true, plan: { select: { name: true, monthlyPrice: true } } } },
        products: { select: { id: true, name: true, active: true } },
        orders: { select: { id: true, orderNumber: true, status: true, totalAmount: true } },
        reviews: { select: { id: true, rating: true, status: true } },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: business.ownerProfileId },
      select: { id: true, displayName: true, phone: true, createdAt: true },
    });

    const totalProducts = await this.prisma.product.count({ where: { businessId } });
    const totalOrders = await this.prisma.order.count({ where: { businessId } });
    const totalReviews = await this.prisma.review.count({ where: { businessId } });
    const totalFollowers = await this.prisma.follower.count({ where: { businessId } });

    return {
      data: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        status: business.status,
        ownerProfile,
        category: business.category ? { name: business.category.name } : null,
        subscription: business.subscription,
        products: { total: totalProducts, items: business.products },
        orders: { total: totalOrders, items: business.orders },
        reviews: { total: totalReviews, items: business.reviews },
        followers: totalFollowers,
      },
    };
  }

  async updateBusinessStatus(businessId: string, status: BusinessStatus) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.status === status) {
      return { data: { message: 'Business status unchanged', business: { id: business.id, status: business.status } } };
    }

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: { status },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getBusinessSubscription(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return { data: { subscription: business.subscription } };
  }

  async getBusinessProducts(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { products } };
  }

  async getBusinessOrders(businessId: string) {
    const orders = await this.prisma.order.findMany({
      where: { businessId },
      include: {
        consumerProfile: { select: { displayName: true } },
        items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { orders } };
  }

  async getBusinessReviews(businessId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { businessId },
      include: {
        consumerProfile: { select: { displayName: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { reviews } };
  }

  async getBusinessPayments(businessId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { businessId },
      include: {
        order: { select: { orderNumber: true } },
        businessSubscription: { select: { plan: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: { payments } };
  }

  async getProducts(query: { search?: string; active?: string; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.active) {
      where.active = query.active === 'true';
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' as any };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const }, include: { business: { select: { name: true } }, category: { select: { name: true } } } }),
      this.prisma.product.count({ where }),
    ]);

    return { data: { products, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async moderateProduct(productId: string, active: boolean) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { active },
    });

    return { data: { id: updated.id, active: updated.active } };
  }

  async getReviews(query: { status?: ReviewStatus; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' as const },
        include: { business: { select: { name: true } }, consumerProfile: { select: { displayName: true } }, product: { select: { name: true } } },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { data: { reviews, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async moderateReview(reviewId: string, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getComments(query: { limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const comments = await this.prisma.comment.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' as const },
      include: { user: { select: { role: true } }, business: { select: { name: true } } },
    });

    return { data: { comments } };
  }

  async moderateComment(commentId: string, status: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getReports(query: { limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const reports = await this.prisma.report.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' as const },
      include: { reporter: { select: { role: true } } },
    });

    return { data: { reports } };
  }

  async resolveReport(reportId: string, status: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getOrders(query: { status?: OrderStatus; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const }, include: { consumerProfile: { select: { displayName: true } }, business: { select: { name: true } }, items: { select: { productNameSnapshot: true, quantity: true, unitPrice: true } } } }),
      this.prisma.order.count({ where }),
    ]);

    return { data: { orders, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consumerProfile: { select: { displayName: true } },
        business: { select: { name: true, status: true } },
        items: { include: { product: { select: { name: true } } } },
        statusEvents: { orderBy: { createdAt: 'desc' as const } },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { data: { order } };
  }

  async updateOrderStatus(orderId: string, status: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getPayments(query: { status?: PaymentStatus; purpose?: string; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.purpose) {
      where.purpose = query.purpose;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const }, include: { order: { select: { orderNumber: true } }, businessSubscription: { select: { plan: { select: { name: true } } } }, business: { select: { name: true } } } }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: { payments, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { select: { orderNumber: true, status: true } },
        businessSubscription: { include: { plan: { select: { name: true } } } },
        business: { select: { name: true } },
        ledgerEntries: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return { data: { payment } };
  }

  async getPaymentStats(query: { startDate?: string; endDate?: string }) {
    const where = this.buildDateWhere(query);

    const [
      totalPayments,
      paidPayments,
      failedPayments,
      refundedPayments,
      pendingPayments,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.count({ where: { status: 'PAID', ...where } }),
      this.prisma.payment.count({ where: { status: 'FAILED', ...where } }),
      this.prisma.payment.count({ where: { status: 'REFUNDED', ...where } }),
      this.prisma.payment.count({ where: { status: 'PENDING', ...where } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', ...where },
        _sum: { amount: true },
      }),
    ]);

    return {
      data: {
        totalPayments,
        paidPayments,
        failedPayments,
        refundedPayments,
        pendingPayments,
        revenue: Number(totalRevenue._sum.amount || 0),
      },
    };
  }

  async getSubscriptions(query: { status?: SubscriptionStatus; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.businessSubscription.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const }, include: { business: { select: { name: true } }, plan: { select: { name: true, monthlyPrice: true } } } }),
      this.prisma.businessSubscription.count({ where }),
    ]);

    return { data: { subscriptions, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getSubscription(subscriptionId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { id: subscriptionId },
      include: { business: { select: { name: true, status: true } }, plan: { select: { name: true, monthlyPrice: true, active: true } } },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return { data: { subscription } };
  }

  async getPayouts(query: { status?: string; businessId?: string; limit?: string; offset?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.businessId) {
      where.businessId = query.businessId;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' as const } }),
      this.prisma.payout.count({ where }),
    ]);

    return { data: { payouts, meta: { total, page: Math.floor(offset / limit) + 1, limit } } };
  }

  async getPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        business: { select: { name: true, status: true } },
        requestedBy: { select: { id: true, role: true } },
        approvedBy: { select: { id: true, role: true } },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return { data: { payout } };
  }

  async approvePayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status === 'APPROVED') {
      return { data: { message: 'Payout already approved', payout: { id: payout.id, status: payout.status } } };
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'APPROVED' },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async rejectPayout(payoutId: string, reason: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    const updated = await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'REJECTED', adminNotes: reason },
    });

    return { data: { id: updated.id, status: updated.status } };
  }

  async getBusinessLedger(businessId: string) {
    const ledgerEntries = await this.prisma.businessLedgerEntry.findMany({
      where: { businessId },
      include: {
        payment: { select: { id: true, purpose: true, amount: true, status: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        workshopBooking: { select: { id: true } },
        payout: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' as const },
    });

    return { data: { ledgerEntries } };
  }

  private buildDateWhere(query: { startDate?: string; endDate?: string }) {
    const where: Record<string, any> = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }
    return where;
  }
}
