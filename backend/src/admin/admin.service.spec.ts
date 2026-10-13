import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus, OrderStatus, BusinessStatus, ReviewStatus, PaymentStatus, SubscriptionStatus } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      business: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      businessSubscription: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      order: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      product: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      workshop: { count: jest.fn() },
      workshopBooking: { count: jest.fn() },
      review: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      payment: { aggregate: jest.fn(), count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      payout: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      report: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      paymentWebhookEvent: { count: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      businessOwnerProfile: { findUnique: jest.fn() },
      follower: { count: jest.fn() },
      comment: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      businessLedgerEntry: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getDashboard', () => {
    it('should return all dashboard metrics', async () => {
      prisma.user.count.mockResolvedValueOnce(4);
      prisma.user.count.mockResolvedValueOnce(2);
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.business.count.mockResolvedValueOnce(4);
      prisma.business.count.mockResolvedValueOnce(1);
      prisma.business.count.mockResolvedValueOnce(1);
      prisma.business.count.mockResolvedValueOnce(1);
      prisma.businessSubscription.count.mockResolvedValue(3);
      prisma.order.count.mockResolvedValue(10);
      prisma.product.count.mockResolvedValue(25);
      prisma.workshop.count.mockResolvedValue(5);
      prisma.workshopBooking.count.mockResolvedValue(20);
      prisma.review.count.mockResolvedValueOnce(50);
      prisma.review.count.mockResolvedValueOnce(5);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1500.0 } });
      prisma.payout.count.mockResolvedValue(2);
      prisma.report.count.mockResolvedValue(3);
      prisma.paymentWebhookEvent.count.mockResolvedValue(1);

      const result = await service.getDashboard({});

      expect(result.data.users.total).toBe(4);
      expect(result.data.users.consumers).toBe(2);
      expect(result.data.users.businessOwners).toBe(1);
      expect(result.data.businesses.total).toBe(4);
      expect(result.data.businesses.active).toBe(1);
      expect(result.data.businesses.pending).toBe(1);
      expect(result.data.businesses.suspended).toBe(1);
      expect(result.data.subscriptions.active).toBe(3);
      expect(result.data.orders.total).toBe(10);
      expect(result.data.products.total).toBe(25);
      expect(result.data.workshops.total).toBe(5);
      expect(result.data.bookings.total).toBe(20);
      expect(result.data.reviews.total).toBe(50);
      expect(result.data.reviews.pending).toBe(5);
      expect(result.data.revenue).toBe(1500.0);
      expect(result.data.pendingPayouts).toBe(2);
      expect(result.data.reportedContent).toBe(3);
      expect(result.data.failedWebhooks).toBe(1);
    });

    it('should handle empty datasets', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.business.count.mockResolvedValue(0);
      prisma.businessSubscription.count.mockResolvedValue(0);
      prisma.order.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);
      prisma.workshop.count.mockResolvedValue(0);
      prisma.workshopBooking.count.mockResolvedValue(0);
      prisma.review.count.mockResolvedValue(0);
      prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.payout.count.mockResolvedValue(0);
      prisma.report.count.mockResolvedValue(0);
      prisma.paymentWebhookEvent.count.mockResolvedValue(0);

      const result = await service.getDashboard({});

      expect(result.data.users.total).toBe(0);
      expect(result.data.revenue).toBe(0);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a', email: 'a@example.com', role: UserRole.CONSUMER, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ]);
      prisma.user.count.mockResolvedValue(1);
      prisma.consumerProfile.findUnique.mockResolvedValue({ displayName: 'Alice' });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(null);

      const result = await service.getUsers({ limit: '10', offset: '0' });

      expect(result.data.users.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by role', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a', email: 'a@example.com', role: UserRole.BUSINESS_OWNER, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ]);
      prisma.user.count.mockResolvedValue(1);
      prisma.consumerProfile.findUnique.mockResolvedValue(null);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue({ displayName: 'Bob' });

      const result = await service.getUsers({ role: UserRole.BUSINESS_OWNER });

      expect(result.data.users[0].role).toBe(UserRole.BUSINESS_OWNER);
    });

    it('should filter by status', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-a', email: 'a@example.com', role: UserRole.CONSUMER, status: UserStatus.SUSPENDED, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ]);
      prisma.user.count.mockResolvedValue(1);
      prisma.consumerProfile.findUnique.mockResolvedValue(null);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(null);

      const result = await service.getUsers({ status: UserStatus.SUSPENDED });

      expect(result.data.users[0].status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('getUser', () => {
    it('should return user details with orders and businesses', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-a', email: 'a@example.com', role: UserRole.CONSUMER, status: UserStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      });
      prisma.consumerProfile.findUnique.mockResolvedValue({ displayName: 'Alice', firstName: 'Alice', lastName: 'Smith', phone: '06-12345678' });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([
        { id: 'order-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0, createdAt: new Date() },
      ]);

      const result = await service.getUser('user-a');

      expect(result.data.id).toBe('user-a');
      expect(result.data.email).toBe('a@example.com');
      expect(result.data.displayName).toBe('Alice');
      expect(result.data.orderCount).toBe(1);
      expect(result.data.businessCount).toBe(0);
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUser('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserStatus', () => {
    it('should suspend a user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-a', status: UserStatus.ACTIVE });
      prisma.user.update.mockResolvedValue({ id: 'user-a', status: UserStatus.SUSPENDED });

      const result = await service.updateUserStatus('user-a', UserStatus.SUSPENDED);
      expect(result.data.status).toBe(UserStatus.SUSPENDED);
    });

    it('should return unchanged if status is the same', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-a', status: UserStatus.ACTIVE });

      const result = await service.updateUserStatus('user-a', UserStatus.ACTIVE);
      expect(result.data.message).toBe('User status unchanged');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateUserStatus('nonexistent', UserStatus.SUSPENDED)).rejects.toThrow('User not found');
    });
  });

  describe('getUserOrders', () => {
    it('should return consumer orders', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-a', role: UserRole.CONSUMER });
      prisma.order.findMany.mockResolvedValue([
        { id: 'order-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0, createdAt: new Date() },
      ]);

      const result = await service.getUserOrders('user-a');
      expect(result.data.orders.length).toBe(1);
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserOrders('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getUserBusinesses', () => {
    it('should return business owner businesses', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'owner-a', role: UserRole.BUSINESS_OWNER });
      prisma.business.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Test Business', status: UserStatus.ACTIVE, createdAt: new Date() },
      ]);

      const result = await service.getUserBusinesses('owner-a');
      expect(result.data.businesses.length).toBe(1);
    });

    it('should return empty array for consumers', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'consumer-a', role: UserRole.CONSUMER });
      const result = await service.getUserBusinesses('consumer-a');
      expect(result.data.businesses).toEqual([]);
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserBusinesses('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getBusinesses', () => {
    it('should return paginated businesses', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Test Business', slug: 'test-business', status: BusinessStatus.ACTIVE, createdAt: new Date(), deletedAt: null, ownerProfile: { displayName: 'Owner' }, category: { name: 'Food' }, subscription: { status: 'ACTIVE', plan: { name: 'Webshop' } }, products: [], orders: [], reviews: [] },
      ]);
      prisma.business.count.mockResolvedValue(1);

      const result = await service.getBusinesses({ limit: '10', offset: '0' });

      expect(result.data.businesses.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Pending Business', slug: 'pending', status: BusinessStatus.PENDING_APPROVAL, createdAt: new Date(), deletedAt: null },
      ]);
      prisma.business.count.mockResolvedValue(1);

      const result = await service.getBusinesses({ status: 'PENDING_APPROVAL' });

      expect(result.data.businesses[0].status).toBe(BusinessStatus.PENDING_APPROVAL);
    });

    it('should search by name', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'biz-1', name: 'Coffee Shop', slug: 'coffee-shop', status: BusinessStatus.ACTIVE, createdAt: new Date(), deletedAt: null },
      ]);
      prisma.business.count.mockResolvedValue(1);

      const result = await service.getBusinesses({ search: 'coffee' });

      expect(result.data.businesses[0].name).toBe('Coffee Shop');
    });
  });

  describe('getBusiness', () => {
    it('should return business details with counts', async () => {
      prisma.business.findUnique.mockResolvedValue({
        id: 'biz-1', name: 'Test Business', slug: 'test-business', status: BusinessStatus.ACTIVE,
        ownerProfileId: 'owner-a', categoryId: 'cat-1',
        ownerProfile: { displayName: 'Owner' }, category: { name: 'Food' },
        subscription: { status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(), plan: { name: 'Webshop', monthlyPrice: 50.0 } },
        products: [{ id: 'p-1', name: 'Product 1', active: true }],
        orders: [{ id: 'o-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0 }],
        reviews: [{ id: 'r-1', rating: 5, status: 'PUBLISHED' }],
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue({ id: 'owner-a', displayName: 'Owner', phone: '020-1234567', createdAt: new Date() });
      prisma.product.count.mockResolvedValue(5);
      prisma.order.count.mockResolvedValue(10);
      prisma.review.count.mockResolvedValue(20);
      prisma.follower.count.mockResolvedValue(3);

      const result = await service.getBusiness('biz-1');

      expect(result.data.id).toBe('biz-1');
      expect(result.data.name).toBe('Test Business');
      expect(result.data.status).toBe(BusinessStatus.ACTIVE);
      expect(result.data.products.total).toBe(5);
      expect(result.data.orders.total).toBe(10);
      expect(result.data.reviews.total).toBe(20);
      expect(result.data.followers).toBe(3);
    });

    it('should throw NotFoundException for nonexistent business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.getBusiness('nonexistent')).rejects.toThrow('Business not found');
    });
  });

  describe('updateBusinessStatus', () => {
    it('should approve a business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.PENDING_APPROVAL });
      prisma.business.update.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.ACTIVE });

      const result = await service.updateBusinessStatus('biz-1', BusinessStatus.ACTIVE);
      expect(result.data.status).toBe(BusinessStatus.ACTIVE);
    });

    it('should reject a business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.PENDING_APPROVAL });
      prisma.business.update.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.DISABLED });

      const result = await service.updateBusinessStatus('biz-1', BusinessStatus.DISABLED);
      expect(result.data.status).toBe(BusinessStatus.DISABLED);
    });

    it('should suspend a business', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.ACTIVE });
      prisma.business.update.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.SUSPENDED });

      const result = await service.updateBusinessStatus('biz-1', BusinessStatus.SUSPENDED);
      expect(result.data.status).toBe(BusinessStatus.SUSPENDED);
    });

    it('should return unchanged if status is the same', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz-1', status: BusinessStatus.ACTIVE });

      const result = await service.updateBusinessStatus('biz-1', BusinessStatus.ACTIVE);
      expect(result.data.message).toBe('Business status unchanged');
      expect(prisma.business.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for nonexistent business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.updateBusinessStatus('nonexistent', BusinessStatus.ACTIVE)).rejects.toThrow('Business not found');
    });
  });

  describe('getBusinessSubscription', () => {
    it('should return business subscription', async () => {
      prisma.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        subscription: { status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(), plan: { name: 'Webshop', monthlyPrice: 50.0 } },
      });

      const result = await service.getBusinessSubscription('biz-1');
      expect(result.data.subscription.status).toBe('ACTIVE');
    });

    it('should throw NotFoundException for nonexistent business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.getBusinessSubscription('nonexistent')).rejects.toThrow('Business not found');
    });
  });

  describe('getBusinessProducts', () => {
    it('should return business products', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Product 1', active: true },
        { id: 'p-2', name: 'Product 2', active: true },
      ]);

      const result = await service.getBusinessProducts('biz-1');
      expect(result.data.products.length).toBe(2);
    });
  });

  describe('getBusinessOrders', () => {
    it('should return business orders', async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: 'o-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0 },
        { id: 'o-2', orderNumber: 'ORD-002', status: OrderStatus.PENDING, totalAmount: 30.0 },
      ]);

      const result = await service.getBusinessOrders('biz-1');
      expect(result.data.orders.length).toBe(2);
    });
  });

  describe('getBusinessReviews', () => {
    it('should return business reviews', async () => {
      prisma.review.findMany.mockResolvedValue([
        { id: 'r-1', rating: 5, status: 'PUBLISHED' },
        { id: 'r-2', rating: 3, status: 'PENDING' },
      ]);

      const result = await service.getBusinessReviews('biz-1');
      expect(result.data.reviews.length).toBe(2);
    });
  });

  describe('getBusinessPayments', () => {
    it('should return business payments', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', purpose: 'PRODUCT_ORDER', status: 'PAID', amount: 50.0 },
        { id: 'pay-2', purpose: 'BUSINESS_SUBSCRIPTION', status: 'PAID', amount: 100.0 },
      ]);

      const result = await service.getBusinessPayments('biz-1');
      expect(result.data.payments.length).toBe(2);
    });
  });

  describe('getProducts', () => {
    it('should return paginated products', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Test Product', active: true, businessId: 'biz-1', category: { name: 'Food' }, business: { name: 'Test Business' } },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getProducts({ limit: '10', offset: '0' });
      expect(result.data.products.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by active status', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Active Product', active: true, businessId: 'biz-1', category: null, business: null },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getProducts({ active: 'true' });
      expect(result.data.products[0].active).toBe(true);
    });

    it('should search by name', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Laptop', active: true, businessId: 'biz-1', category: null, business: null },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getProducts({ search: 'laptop' });
      expect(result.data.products[0].name).toBe('Laptop');
    });
  });

  describe('moderateProduct', () => {
    it('should disable a product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p-1', name: 'Test Product', active: true });
      prisma.product.update.mockResolvedValue({ id: 'p-1', active: false });

      const result = await service.moderateProduct('p-1', false);
      expect(result.data.active).toBe(false);
    });

    it('should throw NotFoundException for nonexistent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.moderateProduct('nonexistent', false)).rejects.toThrow('Product not found');
    });
  });

  describe('getReviews', () => {
    it('should return paginated reviews', async () => {
      prisma.review.findMany.mockResolvedValue([
        { id: 'r-1', rating: 5, status: ReviewStatus.PUBLISHED, business: { name: 'Biz' }, consumerProfile: { displayName: 'Alice' } },
      ]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getReviews({ limit: '10', offset: '0' });
      expect(result.data.reviews.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.review.findMany.mockResolvedValue([
        { id: 'r-1', rating: 5, status: ReviewStatus.PENDING, business: null, consumerProfile: null },
      ]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getReviews({ status: ReviewStatus.PENDING });
      expect(result.data.reviews[0].status).toBe(ReviewStatus.PENDING);
    });
  });

  describe('moderateReview', () => {
    it('should hide a review', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r-1', status: ReviewStatus.PUBLISHED });
      prisma.review.update.mockResolvedValue({ id: 'r-1', status: ReviewStatus.HIDDEN });

      const result = await service.moderateReview('r-1', ReviewStatus.HIDDEN);
      expect(result.data.status).toBe(ReviewStatus.HIDDEN);
    });

    it('should throw NotFoundException for nonexistent review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.moderateReview('nonexistent', ReviewStatus.HIDDEN)).rejects.toThrow('Review not found');
    });
  });

  describe('getComments', () => {
    it('should return comments', async () => {
      prisma.comment.findMany.mockResolvedValue([
        { id: 'c-1', body: 'Great product', status: 'PUBLISHED', user: { role: UserRole.CONSUMER }, business: { name: 'Biz' } },
      ]);

      const result = await service.getComments({});
      expect(result.data.comments.length).toBe(1);
    });
  });

  describe('moderateComment', () => {
    it('should hide a comment', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c-1', status: 'PUBLISHED' });
      prisma.comment.update.mockResolvedValue({ id: 'c-1', status: 'HIDDEN' });

      const result = await service.moderateComment('c-1', 'HIDDEN');
      expect(result.data.status).toBe('HIDDEN');
    });

    it('should throw NotFoundException for nonexistent comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await expect(service.moderateComment('nonexistent', 'HIDDEN')).rejects.toThrow('Comment not found');
    });
  });

  describe('getReports', () => {
    it('should return reports', async () => {
      prisma.report.findMany.mockResolvedValue([
        { id: 'rep-1', reason: 'Inappropriate content', status: 'OPEN', reporter: { role: UserRole.CONSUMER } },
      ]);

      const result = await service.getReports({});
      expect(result.data.reports.length).toBe(1);
    });
  });

  describe('resolveReport', () => {
    it('should resolve a report', async () => {
      prisma.report.findUnique.mockResolvedValue({ id: 'rep-1', status: 'OPEN' });
      prisma.report.update.mockResolvedValue({ id: 'rep-1', status: 'RESOLVED' });

      const result = await service.resolveReport('rep-1', 'RESOLVED');
      expect(result.data.status).toBe('RESOLVED');
    });

    it('should throw NotFoundException for nonexistent report', async () => {
      prisma.report.findUnique.mockResolvedValue(null);
      await expect(service.resolveReport('nonexistent', 'RESOLVED')).rejects.toThrow('Report not found');
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: 'order-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0, createdAt: new Date() },
      ]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getOrders({ limit: '10', offset: '0' });

      expect(result.data.orders.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.order.findMany.mockResolvedValue([
        { id: 'order-1', orderNumber: 'ORD-001', status: OrderStatus.PENDING, totalAmount: 30.0 },
      ]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getOrders({ status: OrderStatus.PENDING });

      expect(result.data.orders[0].status).toBe(OrderStatus.PENDING);
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1', orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED, totalAmount: 50.0,
        consumerProfile: { displayName: 'Alice', email: 'alice@example.com' },
        business: { name: 'Test Biz', status: BusinessStatus.ACTIVE },
        items: [{ productNameSnapshot: 'Product 1', quantity: 2, unitPrice: 25.0, product: { name: 'Product 1' } }],
        statusEvents: [{ createdAt: new Date() }],
        payments: [{ id: 'pay-1', amount: 50.0 }],
      });

      const result = await service.getOrder('order-1');

      expect(result.data.order.id).toBe('order-1');
      expect(result.data.order.orderNumber).toBe('ORD-001');
    });

    it('should throw NotFoundException for nonexistent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getOrder('nonexistent')).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: OrderStatus.PENDING });
      prisma.order.update.mockResolvedValue({ id: 'order-1', status: OrderStatus.CONFIRMED });

      const result = await service.updateOrderStatus('order-1', OrderStatus.CONFIRMED, 'Admin correction');
      expect(result.data.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should throw NotFoundException for nonexistent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.updateOrderStatus('nonexistent', OrderStatus.CONFIRMED, 'reason')).rejects.toThrow('Order not found');
    });
  });

  describe('getPayments', () => {
    it('should return paginated payments', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', purpose: 'PRODUCT_ORDER', status: PaymentStatus.PAID, amount: 50.0 },
      ]);
      prisma.payment.count.mockResolvedValue(1);

      const result = await service.getPayments({ limit: '10', offset: '0' });

      expect(result.data.payments.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.payment.findMany.mockResolvedValue([
        { id: 'pay-1', purpose: 'PRODUCT_ORDER', status: PaymentStatus.PENDING, amount: 30.0 },
      ]);
      prisma.payment.count.mockResolvedValue(1);

      const result = await service.getPayments({ status: PaymentStatus.PENDING });

      expect(result.data.payments[0].status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('getPayment', () => {
    it('should return payment details', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1', purpose: 'PRODUCT_ORDER', status: PaymentStatus.PAID, amount: 50.0,
        order: { orderNumber: 'ORD-001', status: OrderStatus.CONFIRMED },
        businessSubscription: { plan: { name: 'Webshop' } },
        business: { name: 'Test Biz' },
        ledgerEntries: [{ id: 'led-1', type: 'PAYMENT' }],
      });

      const result = await service.getPayment('pay-1');

      expect(result.data.payment.id).toBe('pay-1');
    });

    it('should throw NotFoundException for nonexistent payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPayment('nonexistent')).rejects.toThrow('Payment not found');
    });
  });

  describe('getSubscriptions', () => {
    it('should return paginated subscriptions', async () => {
      prisma.businessSubscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: SubscriptionStatus.ACTIVE, business: { name: 'Test Biz' }, plan: { name: 'Webshop', monthlyPrice: 50.0 } },
      ]);
      prisma.businessSubscription.count.mockResolvedValue(1);

      const result = await service.getSubscriptions({ limit: '10', offset: '0' });

      expect(result.data.subscriptions.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription details', async () => {
      prisma.businessSubscription.findUnique.mockResolvedValue({
        id: 'sub-1', status: SubscriptionStatus.ACTIVE,
        business: { name: 'Test Biz', status: BusinessStatus.ACTIVE },
        plan: { name: 'Webshop', monthlyPrice: 50.0, active: true },
      });

      const result = await service.getSubscription('sub-1');

      expect(result.data.subscription.id).toBe('sub-1');
      expect(result.data.subscription.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should throw NotFoundException for nonexistent subscription', async () => {
      prisma.businessSubscription.findUnique.mockResolvedValue(null);
      await expect(service.getSubscription('nonexistent')).rejects.toThrow('Subscription not found');
    });
  });

  describe('getPayouts', () => {
    it('should return paginated payouts', async () => {
      prisma.payout.findMany.mockResolvedValue([
        { id: 'pout-1', status: 'PENDING', amount: 50.0, currency: 'EUR', businessId: 'biz-1', createdAt: new Date() },
      ]);
      prisma.payout.count.mockResolvedValue(1);

      const result = await service.getPayouts({ limit: '10', offset: '0' });

      expect(result.data.payouts.length).toBe(1);
      expect(result.data.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      prisma.payout.findMany.mockResolvedValue([
        { id: 'pout-1', status: 'PENDING', amount: 30.0, currency: 'EUR', businessId: 'biz-1', createdAt: new Date() },
      ]);
      prisma.payout.count.mockResolvedValue(1);

      const result = await service.getPayouts({ status: 'PENDING' });

      expect(result.data.payouts[0].status).toBe('PENDING');
    });
  });

  describe('getPayout', () => {
    it('should return payout details', async () => {
      prisma.payout.findUnique.mockResolvedValue({
        id: 'pout-1', status: 'PENDING', amount: 50.0, currency: 'EUR',
        business: { name: 'Test Biz', status: 'ACTIVE' },
        requestedBy: { id: 'user-1', role: UserRole.BUSINESS_OWNER },
        approvedBy: null,
      });

      const result = await service.getPayout('pout-1');

      expect(result.data.payout.id).toBe('pout-1');
    });

    it('should throw NotFoundException for nonexistent payout', async () => {
      prisma.payout.findUnique.mockResolvedValue(null);
      await expect(service.getPayout('nonexistent')).rejects.toThrow('Payout not found');
    });
  });

  describe('approvePayout', () => {
    it('should approve a payout', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 'pout-1', status: 'PENDING' });
      prisma.payout.update.mockResolvedValue({ id: 'pout-1', status: 'APPROVED' });

      const result = await service.approvePayout('pout-1');
      expect(result.data.status).toBe('APPROVED');
    });

    it('should return unchanged if already approved', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 'pout-1', status: 'APPROVED' });

      const result = await service.approvePayout('pout-1');
      expect(result.data.message).toBe('Payout already approved');
      expect(prisma.payout.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for nonexistent payout', async () => {
      prisma.payout.findUnique.mockResolvedValue(null);
      await expect(service.approvePayout('nonexistent')).rejects.toThrow('Payout not found');
    });
  });

  describe('rejectPayout', () => {
    it('should reject a payout', async () => {
      prisma.payout.findUnique.mockResolvedValue({ id: 'pout-1', status: 'PENDING' });
      prisma.payout.update.mockResolvedValue({ id: 'pout-1', status: 'REJECTED' });

      const result = await service.rejectPayout('pout-1', 'Insufficient funds');
      expect(result.data.status).toBe('REJECTED');
    });
  });

  describe('getBusinessLedger', () => {
    it('should return business ledger entries', async () => {
      prisma.businessLedgerEntry.findMany.mockResolvedValue([
        { id: 'led-1', businessId: 'biz-1', type: 'PAYMENT', amountCents: 5000, currency: 'EUR', createdAt: new Date() },
      ]);
      prisma.businessLedgerEntry.count.mockResolvedValue(1);

      const result = await service.getBusinessLedger('biz-1');

      expect(result.data.ledgerEntries.length).toBe(1);
    });
  });
});