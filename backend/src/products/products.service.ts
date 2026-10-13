import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { BusinessStatus, SubscriptionStatus, UserRole } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  // ==========================================
  // PRODUCT CRUD
  // ==========================================

  async createProduct(businessId: string, user: any, dto: CreateProductDto) {
    await this.verifyBusinessOwnership(businessId, user);

    // Enforce subscription feature entitlement
    const hasEntitlement = await this.entitlementService.hasFeature(businessId, 'PRODUCTS');
    if (!hasEntitlement) {
      throw new ForbiddenException(
        'Winkel heeft geen actief Webshop abonnement om producten toe te voegen',
      );
    }

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Productcategorie niet gevonden');
      }
    }

    let slug = this.slugify(dto.name);
    const existingSlug = await this.prisma.product.findFirst({
      where: { businessId, slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.product.create({
      data: {
        businessId,
        categoryId: dto.categoryId || null,
        name: dto.name,
        slug,
        description: dto.description || null,
        price: dto.price,
        stock: dto.stock,
        active: dto.active !== undefined ? dto.active : true,
        shopUrl: dto.shopUrl || null,
      },
      include: {
        category: true,
        images: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
    });
  }

  async getProductsForBusiness(businessId: string, user: any) {
    await this.verifyBusinessOwnership(businessId, user);

    return this.prisma.product.findMany({
      where: { businessId, deletedAt: null },
      include: {
        category: true,
        images: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicProducts(query: QueryProductDto) {
    const where: any = {
      active: true,
      deletedAt: null,
      business: {
        status: BusinessStatus.ACTIVE,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: { gt: new Date() },
        },
      },
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.businessId) {
      where.businessId = query.businessId;
    }

    if (query.city) {
      where.business.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicProductByIdOrSlug(idOrSlug: string, user?: any) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug,
    );

    const product = await this.prisma.product.findFirst({
      where: {
        OR: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }],
        deletedAt: null,
      },
      include: {
        category: true,
        images: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
        business: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product niet gevonden');
    }

    // If product is inactive, check if user is the business owner or admin
    if (!product.active) {
      if (!user) {
        throw new NotFoundException('Product niet gevonden');
      }
      await this.verifyBusinessOwnership(product.businessId, user);
    }

    return product;
  }

  async updateProduct(productId: string, user: any, dto: UpdateProductDto) {
    const product = await this.verifyProductOwnership(productId, user);

    if (dto.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Productcategorie niet gevonden');
      }
    }

    let slug = product.slug;
    if (dto.name && dto.name !== product.name) {
      slug = this.slugify(dto.name);
      const existingSlug = await this.prisma.product.findFirst({
        where: { businessId: product.businessId, slug, id: { not: productId } },
      });
      if (existingSlug) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        slug,
        description: dto.description !== undefined ? dto.description : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        stock: dto.stock !== undefined ? dto.stock : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        shopUrl: dto.shopUrl !== undefined ? dto.shopUrl : undefined,
        active: dto.active !== undefined ? dto.active : undefined,
      },
      include: {
        category: true,
        images: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: true,
      },
    });
  }

  async deleteProduct(productId: string, user: any) {
    await this.verifyProductOwnership(productId, user);

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });
  }

  // ==========================================
  // PRODUCT IMAGES (STRICT MAX 3 IMAGES)
  // ==========================================

  async addImage(productId: string, user: any, dto: CreateProductImageDto) {
    await this.verifyProductOwnership(productId, user);

    const existingImages = await this.prisma.productImage.findMany({
      where: { productId },
    });

    if (existingImages.length >= 3) {
      throw new BadRequestException(
        'Maximaal 3 afbeeldingen toegestaan per product volgens richtlijnen',
      );
    }

    let mediaAssetId = dto.mediaAssetId;
    if (!mediaAssetId) {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          url: dto.url,
          mimeType: 'image/jpeg',
          fileSize: 0,
        },
      });
      mediaAssetId = asset.id;
    }

    const sortOrder =
      dto.sortOrder !== undefined ? dto.sortOrder : existingImages.length;

    return this.prisma.productImage.create({
      data: {
        productId,
        mediaAssetId,
        sortOrder,
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  async getImages(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product niet gevonden');
    }

    return this.prisma.productImage.findMany({
      where: { productId },
      include: { mediaAsset: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteImage(productId: string, imageId: string, user: any) {
    await this.verifyProductOwnership(productId, user);

    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Productafbeelding niet gevonden');
    }

    return this.prisma.productImage.delete({
      where: { id: imageId },
    });
  }

  // ==========================================
  // PRODUCT VARIANTS
  // ==========================================

  async addVariant(productId: string, user: any, dto: CreateProductVariantDto) {
    await this.verifyProductOwnership(productId, user);

    return this.prisma.productVariant.create({
      data: {
        productId,
        size: dto.size || null,
        color: dto.color || null,
        sku: dto.sku || null,
        price: dto.price !== undefined ? dto.price : null,
        stock: dto.stock,
      },
    });
  }

  async getVariants(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product niet gevonden');
    }

    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    user: any,
    dto: UpdateProductVariantDto,
  ) {
    await this.verifyProductOwnership(productId, user);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Productvariant niet gevonden');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        size: dto.size !== undefined ? dto.size : undefined,
        color: dto.color !== undefined ? dto.color : undefined,
        sku: dto.sku !== undefined ? dto.sku : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        stock: dto.stock !== undefined ? dto.stock : undefined,
      },
    });
  }

  async deleteVariant(productId: string, variantId: string, user: any) {
    await this.verifyProductOwnership(productId, user);

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });

    if (!variant) {
      throw new NotFoundException('Productvariant niet gevonden');
    }

    return this.prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async getCategories() {
    return this.prisma.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ==========================================
  // OWNERSHIP HELPERS
  // ==========================================

  private async verifyBusinessOwnership(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return business;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile || business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException(
        'Je bent niet gemachtigd om producten voor deze winkel te beheren',
      );
    }

    return business;
  }

  private async verifyProductOwnership(productId: string, user: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { business: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product niet gevonden');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return product;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile || product.business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException(
        'Je bent niet gemachtigd om dit product te bewerken',
      );
    }

    return product;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
