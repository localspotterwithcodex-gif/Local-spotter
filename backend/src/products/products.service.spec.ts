import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let entitlementService: any;

  const mockUser = {
    id: 'user-owner-1',
    role: UserRole.BUSINESS_OWNER,
  };

  const mockBusiness = {
    id: 'bus-1',
    ownerProfileId: 'profile-1',
    deletedAt: null,
  };

  const mockOwnerProfile = {
    id: 'profile-1',
    userId: 'user-owner-1',
  };

  beforeEach(async () => {
    prisma = {
      business: {
        findUnique: jest.fn(),
      },
      businessOwnerProfile: {
        findUnique: jest.fn(),
      },
      productCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      productImage: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      productVariant: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mediaAsset: {
        create: jest.fn(),
      },
    };

    entitlementService = {
      hasFeature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('should reject product creation if business does not have PRODUCTS entitlement', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createProduct('bus-1', mockUser, {
          name: 'Handgemaakte Leren Shopper',
          price: 149.95,
          stock: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject product creation if user is not the business owner', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.mockImplementation ? null : null;
      prisma.businessOwnerProfile.findUnique.mockResolvedValue({
        id: 'different-profile',
        userId: 'different-user',
      });

      await expect(
        service.createProduct('bus-1', mockUser, {
          name: 'Handgemaakte Leren Shopper',
          price: 149.95,
          stock: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create product successfully when owner and entitlement are valid', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(true);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 'prod-1',
        name: 'Handgemaakte Leren Shopper',
        slug: 'handgemaakte-leren-shopper',
        price: 149.95,
        stock: 10,
      });

      const result = await service.createProduct('bus-1', mockUser, {
        name: 'Handgemaakte Leren Shopper',
        price: 149.95,
        stock: 10,
      });

      expect(result.id).toBe('prod-1');
      expect(prisma.product.create).toHaveBeenCalled();
    });
  });

  describe('addImage (Max 3 Images Rule)', () => {
    it('should throw BadRequestException if product already has 3 images', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'bus-1',
        business: mockBusiness,
        deletedAt: null,
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.productImage.findMany.mockResolvedValue([
        { id: 'img-1' },
        { id: 'img-2' },
        { id: 'img-3' },
      ]);

      await expect(
        service.addImage('prod-1', mockUser, {
          url: 'https://example.com/fourth-image.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow adding an image if product has fewer than 3 images', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        businessId: 'bus-1',
        business: mockBusiness,
        deletedAt: null,
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.productImage.findMany.mockResolvedValue([
        { id: 'img-1' },
      ]);
      prisma.mediaAsset.create.mockResolvedValue({
        id: 'asset-2',
        url: 'https://example.com/image-2.jpg',
      });
      prisma.productImage.create.mockResolvedValue({
        id: 'img-2',
        productId: 'prod-1',
        mediaAssetId: 'asset-2',
        sortOrder: 1,
      });

      const result = await service.addImage('prod-1', mockUser, {
        url: 'https://example.com/image-2.jpg',
      });

      expect(result.id).toBe('img-2');
      expect(prisma.productImage.create).toHaveBeenCalled();
    });
  });

  describe('Ownership Security on Mutations', () => {
    it('should reject updating another owner product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-other',
        businessId: 'bus-other',
        business: {
          id: 'bus-other',
          ownerProfileId: 'profile-other',
          deletedAt: null,
        },
        deletedAt: null,
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      await expect(
        service.updateProduct('prod-other', mockUser, { name: 'Hacked Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
