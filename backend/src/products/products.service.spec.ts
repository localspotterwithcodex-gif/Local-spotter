import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { TranslationService } from '../translation/translation.service';
import { FavoritesService } from '../favorites/favorites.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let entitlementService: any;
  let translation: { translateFields: jest.Mock; backfill: jest.Mock };

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
      review: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    entitlementService = {
      hasFeature: jest.fn(),
    };

    translation = { backfill: jest.fn().mockResolvedValue(undefined), translateFields: jest.fn().mockResolvedValue({ sourceLocale: null, translations: null }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
        { provide: TranslationService, useValue: translation },
        { provide: FavoritesService, useValue: { countsForProducts: jest.fn().mockResolvedValue(new Map()) } },
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

  describe('product specifications', () => {
    it('stores VAT, brand and dimensions on update, trimming the brand', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', businessId: 'bus-1', name: 'x', slug: 'x', price: 10, compareAtPrice: null, description: null,
        business: mockBusiness, deletedAt: null,
      });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.product.update.mockResolvedValue({ id: 'prod-1' });
      await service.updateProduct('prod-1', mockUser, { vatRate: 9, brand: '  Studio  ', weightGrams: 500, lengthMm: 300 });
      const data = prisma.product.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ vatRate: 9, brand: 'Studio', weightGrams: 500, lengthMm: 300 });
      expect(data.widthMm).toBeUndefined();
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
  describe('public product ratings', () => {
    it('adds the average and count of PUBLISHED reviews to the product list', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      prisma.review.groupBy.mockResolvedValue([{ productId: 'p1', _avg: { rating: 4.333 }, _count: { _all: 3 } }]);
      const res = await service.getPublicProducts({} as any);
      expect(res).toEqual([
        { id: 'p1', averageRating: 4.3, ratingCount: 3, likeCount: 0 },
        { id: 'p2', averageRating: 0, ratingCount: 0, likeCount: 0 },
      ]);
      const where = prisma.review.groupBy.mock.calls[0][0].where;
      expect(where).toMatchObject({ status: 'PUBLISHED', deletedAt: null, productId: { in: ['p1', 'p2'] } });
    });

    it('does not query reviews for an empty list', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      expect(await service.getPublicProducts({} as any)).toEqual([]);
      expect(prisma.review.groupBy).not.toHaveBeenCalled();
    });

    it('filters by radius, drops stores without coordinates and sorts by distance', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'far', business: { latitude: 51.9244, longitude: 4.4777 } },
        { id: 'near', business: { latitude: 52.37, longitude: 4.9 } },
        { id: 'nocoords', business: { latitude: null, longitude: null } },
      ]);
      prisma.review.groupBy.mockResolvedValue([]);
      const res = await service.getPublicProducts({ lat: 52.3676, lng: 4.9041, radiusKm: 100, sort: 'distance' } as any);
      expect(res.map((p: any) => p.id)).toEqual(['near', 'far']);
      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.business.latitude).toEqual(expect.objectContaining({ gte: expect.any(Number), lte: expect.any(Number) }));
    });

    it('applies in-stock and price sort at the database level', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.getPublicProducts({ inStock: true, sort: 'price_asc' } as any);
      const args = prisma.product.findMany.mock.calls[0][0];
      expect(args.where.stock).toEqual({ gt: 0 });
      expect(args.orderBy).toEqual({ price: 'asc' });
    });

    it('adds ratings to a single product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', active: true, businessId: 'bus-1' });
      prisma.review.groupBy.mockResolvedValue([{ productId: 'p1', _avg: { rating: 5 }, _count: { _all: 1 } }]);
      const res = await service.getPublicProductByIdOrSlug('p1');
      expect(res).toMatchObject({ id: 'p1', averageRating: 5, ratingCount: 1 });
    });
  });
  describe('translation and old price', () => {
    const ownerSetup = () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(true);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockImplementation(async ({ data }: any) => ({ id: 'p1', ...data }));
    };

    it('stores the EN/NL translations and detected source language on create', async () => {
      ownerSetup();
      translation.translateFields.mockResolvedValue({
        sourceLocale: 'nl',
        translations: { en: { name: 'Leather tote' }, nl: { name: 'Leren shopper' } },
      });
      await service.createProduct('bus-1', mockUser, { name: 'Leren shopper', price: 10, stock: 1 });
      const data = prisma.product.create.mock.calls[0][0].data;
      expect(data.sourceLocale).toBe('nl');
      expect(data.translations.en.name).toBe('Leather tote');
      expect(data.name).toBe('Leren shopper');
    });

    it('still saves the product when translation is unavailable', async () => {
      ownerSetup();
      await service.createProduct('bus-1', mockUser, { name: 'Tas', price: 10, stock: 1 });
      const data = prisma.product.create.mock.calls[0][0].data;
      expect(data.translations).toBeUndefined();
      expect(data.sourceLocale).toBeNull();
    });

    it('rejects an old price that is not higher than the price', async () => {
      ownerSetup();
      await expect(
        service.createProduct('bus-1', mockUser, { name: 'Tas', price: 50, compareAtPrice: 50, stock: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });
});
