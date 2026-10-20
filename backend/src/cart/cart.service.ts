import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { BusinessStatus } from '@prisma/client';

import { getFlatShippingFee } from '../common/config/shipping';
import { fulfilmentOptions } from '../orders/fulfilment';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  // ==========================================
  // GET CART
  // ==========================================
  async getCart(user: any) {
    const consumerProfile = await this.getConsumerProfile(user);

    const cart = await this.prisma.cart.findUnique({
      where: { consumerProfileId: consumerProfile.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  include: { mediaAsset: true },
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                },
                business: {
                  select: {
                    id: true, name: true, slug: true, city: true, latitude: true, longitude: true,
                    pickupEnabled: true, shippingEnabled: true, localDeliveryEnabled: true,
                    shippingFee: true, freeShippingThreshold: true, localDeliveryFee: true, localDeliveryRadiusKm: true,
                  },
                },
              },
            },
            variant: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { id: cart?.id ?? null, items: [], groups: [], subtotal: 0, deliveryFee: getFlatShippingFee(), business: null };
    }

    const items = cart.items.map((item) => {
      const unitPrice = item.variant?.price
        ? Number(item.variant.price)
        : Number(item.product.price);
      return {
        ...item,
        unitPrice,
        total: unitPrice * item.quantity,
      };
    });

    // One group per store: the checkout is a single payment but every store fulfils its own part.
    const byStore = new Map<string, typeof items>();
    for (const item of items) {
      const list = byStore.get(item.product.businessId) ?? [];
      list.push(item);
      byStore.set(item.product.businessId, list);
    }
    const groups = [...byStore.values()].map((groupItems) => {
      const b = groupItems[0].product.business;
      const subtotal = groupItems.reduce((acc, i) => acc + i.total, 0);
      return {
        business: { id: b.id, name: b.name, slug: b.slug, city: b.city },
        items: groupItems.map(({ product, ...rest }) => {
          const { business: _business, ...productRest } = product;
          void _business;
          return { ...rest, product: productRest };
        }),
        subtotal,
        fulfilmentOptions: fulfilmentOptions(b, subtotal),
      };
    });

    const subtotal = groups.reduce((acc, g) => acc + g.subtotal, 0);

    return {
      id: cart.id,
      // Kept for older clients: the first store of the cart.
      business: groups[0].business,
      groups,
      items: groups.flatMap((g) => g.items),
      subtotal,
      deliveryFee: getFlatShippingFee(),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  // ==========================================
  // ADD ITEM TO CART
  // ==========================================
  async addItem(user: any, dto: AddCartItemDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    // 1. Validate business exists and is active
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }
    if (business.status !== BusinessStatus.ACTIVE) {
      throw new BadRequestException('Winkel is momenteel niet actief');
    }

    // 2. Validate business subscription entitlement
    const hasProductsEntitlement = await this.entitlementService.hasFeature(
      dto.businessId,
      'PRODUCTS',
    );
    if (!hasProductsEntitlement) {
      throw new ForbiddenException(
        'Deze winkel heeft momenteel geen actief webshoppakket om bestellingen te ontvangen',
      );
    }

    // 3. Validate product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product niet gevonden');
    }
    if (!product.active) {
      throw new BadRequestException('Product is niet beschikbaar');
    }
    if (product.businessId !== dto.businessId) {
      throw new BadRequestException('Product behoort niet tot deze winkel');
    }

    // 4. Validate variant if provided
    let variant = null;
    if (dto.variantId) {
      variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) {
        throw new NotFoundException('Productvariant niet gevonden of behoort niet tot dit product');
      }
    }

    // 5. Validate stock
    const availableStock = variant ? variant.stock : product.stock;
    if (dto.quantity > availableStock) {
      throw new BadRequestException(
        `Onvoldoende voorraad. Beschikbaar: ${availableStock}, gevraagd: ${dto.quantity}`,
      );
    }

    // 6. Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { consumerProfileId: consumerProfile.id },
      include: { items: true },
    });

    // A cart may hold products of several stores; the checkout splits it per store.
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { consumerProfileId: consumerProfile.id },
        include: { items: true },
      });
    }

    // 7. Check if item already exists — increment quantity
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > availableStock) {
        throw new BadRequestException(
          `Onvoldoende voorraad. Beschikbaar: ${availableStock}, totaal gevraagd: ${newQty}`,
        );
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: { product: true, variant: true },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
        quantity: dto.quantity,
      },
      include: { product: true, variant: true },
    });
  }

  // ==========================================
  // UPDATE ITEM QUANTITY
  // ==========================================
  async updateItem(user: any, itemId: string, dto: UpdateCartItemDto) {
    const { item: cartItem } = await this.verifyCartItemOwnership(user, itemId);

    const product = await this.prisma.product.findUnique({
      where: { id: cartItem.productId },
    });
    if (!product || !product.active || product.deletedAt) {
      throw new BadRequestException('Product is niet meer beschikbaar');
    }

    let availableStock = product.stock;
    if (cartItem.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: cartItem.variantId },
      });
      if (!variant) {
        throw new NotFoundException('Productvariant niet meer beschikbaar');
      }
      availableStock = variant.stock;
    }

    if (dto.quantity > availableStock) {
      throw new BadRequestException(
        `Onvoldoende voorraad. Beschikbaar: ${availableStock}, gevraagd: ${dto.quantity}`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
      include: { product: true, variant: true },
    });
  }

  // ==========================================
  // REMOVE ITEM
  // ==========================================
  async removeItem(user: any, itemId: string) {
    const { cart } = await this.verifyCartItemOwnership(user, itemId);

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    void cart;

    return { message: 'Item verwijderd uit winkelwagen' };
  }

  // ==========================================
  // CLEAR CART
  // ==========================================
  async clearCart(user: any) {
    const consumerProfile = await this.getConsumerProfile(user);
    const cart = await this.prisma.cart.findUnique({
      where: { consumerProfileId: consumerProfile.id },
    });

    if (!cart) {
      return { message: 'Winkelwagen is al leeg' };
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return { message: 'Winkelwagen geleegd' };
  }

  // ==========================================
  // HELPERS
  // ==========================================
  async getConsumerProfile(user: any) {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new ForbiddenException('Geen consumentenprofiel gevonden voor deze gebruiker');
    }
    return profile;
  }

  private async verifyCartItemOwnership(user: any, itemId: string) {
    const consumerProfile = await this.getConsumerProfile(user);
    const cart = await this.prisma.cart.findUnique({
      where: { consumerProfileId: consumerProfile.id },
    });

    if (!cart) {
      throw new NotFoundException('Winkelwagen niet gevonden');
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Winkelwagen item niet gevonden');
    }

    return { item, cart };
  }
}
