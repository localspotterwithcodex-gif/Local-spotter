import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { AllowedOrderStatusInput } from './dto/update-order-status.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let entitlementService: any;

  const mockConsumerUser = {
    id: 'user-consumer-1',
    role: UserRole.CONSUMER,
  };

  const mockOtherConsumerUser = {
    id: 'user-consumer-2',
    role: UserRole.CONSUMER,
  };

  const mockOwnerUser = {
    id: 'user-owner-1',
    role: UserRole.BUSINESS_OWNER,
  };

  const mockConsumerProfile = {
    id: 'consumer-profile-1',
    userId: 'user-consumer-1',
    displayName: 'Jan Jansen',
  };

  const mockOwnerProfile = {
    id: 'owner-profile-1',
    userId: 'user-owner-1',
  };

  const mockBusiness = {
    id: 'bus-1',
    ownerProfileId: 'owner-profile-1',
    name: 'Atelier Bloem',
    slug: 'atelier-bloem',
    status: BusinessStatus.ACTIVE,
    deletedAt: null,
  };

  const mockDeliveryAddress = {
    street: 'Prinsengracht',
    houseNumber: '100',
    city: 'Amsterdam',
    postalCode: '1015 DZ',
    country: 'NL',
  };

  beforeEach(async () => {
    prisma = {
      consumerProfile: {
        findUnique: jest.fn(),
      },
      businessOwnerProfile: {
        findUnique: jest.fn(),
      },
      business: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        create: jest.fn(),
      },
      orderStatusEvent: {
        create: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
      $executeRaw: jest.fn(),
    };

    entitlementService = {
      hasFeature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrderFromCart', () => {
    it('should reject order creation if cart is empty', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-1',
        items: [],
      });

      await expect(
        service.createOrderFromCart(mockConsumerUser, {
          deliveryAddress: mockDeliveryAddress,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order creation if business lacks PRODUCTS subscription entitlement', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-1',
        business: mockBusiness,
        items: [
          {
            id: 'item-1',
            quantity: 2,
            product: { id: 'prod-1', name: 'Vaas', price: 25, active: true, deletedAt: null },
          },
        ],
      });
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createOrderFromCart(mockConsumerUser, {
          deliveryAddress: mockDeliveryAddress,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException and rollback if stock deduction fails (concurrency check)', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-1',
        business: mockBusiness,
        items: [
          {
            id: 'item-1',
            quantity: 5,
            productId: 'prod-1',
            product: { id: 'prod-1', name: 'Vaas', price: 25, active: true, deletedAt: null },
          },
        ],
      });
      entitlementService.hasFeature.mockResolvedValue(true);
      // Simulate raw query returning 0 affected rows (insufficient stock)
      prisma.$executeRaw.mockResolvedValue(0);

      await expect(
        service.createOrderFromCart(mockConsumerUser, {
          deliveryAddress: mockDeliveryAddress,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully create order, snapshot prices, deduct stock, and clear cart', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-1',
        business: mockBusiness,
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            product: { id: 'prod-1', name: 'Leren Tas', price: 75.0, active: true, deletedAt: null },
            variant: null,
          },
        ],
      });
      entitlementService.hasFeature.mockResolvedValue(true);
      prisma.$executeRaw.mockResolvedValue(1); // 1 row updated (stock deducted)

      const createdOrderMock = {
        id: 'order-1',
        orderNumber: 'LS-TEST-1',
        subtotalAmount: 150.0,
        totalAmount: 150.0,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      };
      prisma.order.create.mockResolvedValue(createdOrderMock);
      prisma.order.findUnique.mockResolvedValue({
        ...createdOrderMock,
        business: mockBusiness,
        items: [{ id: 'order-item-1', productNameSnapshot: 'Leren Tas', unitPrice: 75.0 }],
      });

      const result = await service.createOrderFromCart(mockConsumerUser, {
        deliveryAddress: mockDeliveryAddress,
      });

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consumerProfileId: mockConsumerProfile.id,
            businessId: 'bus-1',
            subtotalAmount: 150.0,
            status: OrderStatus.PENDING,
          }),
        }),
      );
      expect(prisma.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productNameSnapshot: 'Leren Tas',
            unitPrice: 75.0,
            quantity: 2,
            subtotalPrice: 150.0,
          }),
        }),
      );
      // Verify cart clearing
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { businessId: null },
      });
    });
  });

  describe('getOrderById & Authorization', () => {
    const mockOrderRecord = {
      id: 'order-1',
      consumerProfile: { userId: 'user-consumer-1' },
      business: { ownerProfileId: 'owner-profile-1' },
    };

    it('should allow ordering consumer to view order', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderRecord);
      const result = await service.getOrderById('order-1', mockConsumerUser);
      expect(result).toBeDefined();
    });

    it('should reject another consumer from viewing the order', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderRecord);
      await expect(service.getOrderById('order-1', mockOtherConsumerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow business owner who received the order to view it', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderRecord);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      const result = await service.getOrderById('order-1', mockOwnerUser);
      expect(result).toBeDefined();
    });
  });

  describe('updateOrderStatus', () => {
    it('should allow valid transition from PENDING to CONFIRMED (or ACCEPTED)', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        businessId: 'bus-1',
        status: OrderStatus.PENDING,
        items: [],
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.order.update.mockResolvedValue({ id: 'order-1', status: OrderStatus.CONFIRMED });

      const result = await service.updateOrderStatus('order-1', mockOwnerUser, {
        status: AllowedOrderStatusInput.ACCEPTED,
      });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.CONFIRMED }),
        }),
      );
    });

    it('should reject invalid transition from PENDING to DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        businessId: 'bus-1',
        status: OrderStatus.PENDING,
        items: [],
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);

      await expect(
        service.updateOrderStatus('order-1', mockOwnerUser, {
          status: AllowedOrderStatusInput.DELIVERED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transitions when order is in terminal DELIVERED state', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        businessId: 'bus-1',
        status: OrderStatus.DELIVERED,
        items: [],
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);

      await expect(
        service.updateOrderStatus('order-1', mockOwnerUser, {
          status: AllowedOrderStatusInput.PREPARING,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    it('should allow consumer to cancel PENDING order and restore stock', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        businessId: 'bus-1',
        status: OrderStatus.PENDING,
        consumerProfile: { userId: 'user-consumer-1' },
        items: [{ productId: 'prod-1', productVariantId: null, quantity: 2 }],
      });
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.order.update.mockResolvedValue({ id: 'order-1', status: OrderStatus.CANCELLED });

      await service.cancelOrder('order-1', mockConsumerUser, {
        reason: 'Verkeerd artikel besteld',
      });

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: OrderStatus.CANCELLED }),
        }),
      );
    });

    it('should prevent consumer from cancelling order already in PREPARING', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        businessId: 'bus-1',
        status: OrderStatus.PREPARING,
        consumerProfile: { userId: 'user-consumer-1' },
        items: [],
      });

      await expect(service.cancelOrder('order-1', mockConsumerUser, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
