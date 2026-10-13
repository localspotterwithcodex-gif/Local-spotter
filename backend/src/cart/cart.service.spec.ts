import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessStatus, UserRole } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let entitlementService: any;

  const mockUser = {
    id: 'user-consumer-1',
    role: UserRole.CONSUMER,
  };

  const mockConsumerProfile = {
    id: 'consumer-profile-1',
    userId: 'user-consumer-1',
    displayName: 'Jan Jansen',
  };

  const mockBusiness = {
    id: 'bus-1',
    name: 'Bakkerij De Lelie',
    slug: 'bakkerij-de-lelie',
    city: 'Amsterdam',
    status: BusinessStatus.ACTIVE,
    deletedAt: null,
  };

  const mockProduct = {
    id: 'prod-1',
    businessId: 'bus-1',
    name: 'Desem Brood',
    price: 4.5,
    stock: 10,
    active: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      consumerProfile: {
        findUnique: jest.fn(),
      },
      business: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    entitlementService = {
      hasFeature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return empty cart state when no cart exists', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart(mockUser);
      expect(result.items).toEqual([]);
      expect(result.subtotal).toBe(0);
    });

    it('should calculate item totals and subtotal correctly', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        consumerProfileId: mockConsumerProfile.id,
        business: mockBusiness,
        items: [
          {
            id: 'item-1',
            quantity: 2,
            product: { price: 4.5, images: [] },
            variant: null,
          },
          {
            id: 'item-2',
            quantity: 1,
            product: { price: 10, images: [] },
            variant: { price: 12 },
          },
        ],
      });

      const result = await service.getCart(mockUser);
      expect(result.items[0].unitPrice).toBe(4.5);
      expect(result.items[0].total).toBe(9);
      expect(result.items[1].unitPrice).toBe(12);
      expect(result.items[1].total).toBe(12);
      expect(result.subtotal).toBe(21);
    });
  });

  describe('addItem', () => {
    beforeEach(() => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      entitlementService.hasFeature.mockResolvedValue(true);
    });

    it('should reject adding item if business lacks PRODUCTS subscription entitlement', async () => {
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.addItem(mockUser, {
          businessId: 'bus-1',
          productId: 'prod-1',
          quantity: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject adding item if requested quantity exceeds available stock', async () => {
      await expect(
        service.addItem(mockUser, {
          businessId: 'bus-1',
          productId: 'prod-1',
          quantity: 15, // Stock is 10
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject adding item from a different business (one-business-per-cart rule)', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-other',
        items: [{ id: 'existing-item' }],
      });

      await expect(
        service.addItem(mockUser, {
          businessId: 'bus-1',
          productId: 'prod-1',
          quantity: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should increment quantity if item already exists in cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        businessId: 'bus-1',
        items: [{ id: 'item-1', productId: 'prod-1', quantity: 2 }],
      });

      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        variantId: null,
        quantity: 2,
      });

      prisma.cartItem.update.mockResolvedValue({
        id: 'item-1',
        quantity: 5,
      });

      const result = await service.addItem(mockUser, {
        businessId: 'bus-1',
        productId: 'prod-1',
        quantity: 3,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { quantity: 5 },
        }),
      );
    });
  });

  describe('updateItem & removeItem', () => {
    it('should validate cart item ownership on update', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        consumerProfileId: mockConsumerProfile.id,
      });
      prisma.cartItem.findFirst.mockResolvedValue(null); // Item not in consumer's cart

      await expect(
        service.updateItem(mockUser, 'item-other', { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove item and unlink business when cart becomes empty', async () => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        consumerProfileId: mockConsumerProfile.id,
      });
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      });
      prisma.cartItem.delete.mockResolvedValue({ id: 'item-1' });
      prisma.cartItem.count.mockResolvedValue(0); // Cart is now empty

      await service.removeItem(mockUser, 'item-1');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { businessId: null },
      });
    });
  });
});
