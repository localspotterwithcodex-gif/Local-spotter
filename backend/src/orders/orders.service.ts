import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AllowedOrderStatusInput, UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { BusinessStatus, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  // ==========================================
  // CREATE ORDER FROM CART (CHECKOUT)
  // ==========================================
  async createOrderFromCart(user: any, dto: CreateOrderDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch consumer's cart with items, products, and variants
      const cart = await tx.cart.findUnique({
        where: { consumerProfileId: consumerProfile.id },
        include: {
          business: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Winkelwagen is leeg');
      }

      if (!cart.businessId || !cart.business) {
        throw new BadRequestException('Geen winkel gekoppeld aan de winkelwagen');
      }

      // 2. Validate business
      const business = cart.business;
      if (business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
        throw new BadRequestException('De winkel is momenteel niet actief of niet beschikbaar');
      }

      // 3. Validate subscription entitlement for business
      const hasProductsEntitlement = await this.entitlementService.hasFeature(
        business.id,
        'PRODUCTS',
      );
      if (!hasProductsEntitlement) {
        throw new ForbiddenException(
          'Deze winkel heeft momenteel geen actief webshoppakket om bestellingen te accepteren',
        );
      }

      // 4. Validate products, variants, and atomically deduct stock
      const orderItemsData: Array<{
        productId: string;
        variantId: string | null;
        productNameSnapshot: string;
        variantSnapshot: string | null;
        unitPrice: number;
        quantity: number;
        subtotalPrice: number;
      }> = [];

      for (const item of cart.items) {
        const product = item.product;

        if (!product || product.deletedAt || !product.active) {
          throw new BadRequestException(
            `Product "${product?.name || item.productId}" is niet meer beschikbaar`,
          );
        }

        let unitPrice = Number(product.price);
        let variantSnapshot: string | null = null;

        if (item.variantId) {
          const variant = item.variant;
          if (!variant || variant.productId !== product.id) {
            throw new BadRequestException(
              `Productvariant voor "${product.name}" is niet meer beschikbaar`,
            );
          }

          if (variant.price !== null && variant.price !== undefined) {
            unitPrice = Number(variant.price);
          }

          const variantParts = [variant.size, variant.color].filter(Boolean);
          variantSnapshot = variantParts.length > 0 ? variantParts.join(' - ') : null;

          // Atomic deduction on variant stock
          const variantDeducted = await tx.$executeRaw`
            UPDATE "product_variants"
            SET "stock" = "stock" - ${item.quantity}, "updated_at" = NOW()
            WHERE "id" = ${item.variantId}::uuid AND "stock" >= ${item.quantity}
          `;

          if (variantDeducted === 0) {
            throw new ConflictException(
              `Onvoldoende voorraad voor variant (${variantSnapshot}) van product "${product.name}".`,
            );
          }
        } else {
          // Atomic deduction on base product stock
          const productDeducted = await tx.$executeRaw`
            UPDATE "products"
            SET "stock" = "stock" - ${item.quantity}, "updated_at" = NOW()
            WHERE "id" = ${product.id}::uuid AND "stock" >= ${item.quantity}
          `;

          if (productDeducted === 0) {
            throw new ConflictException(
              `Onvoldoende voorraad voor product "${product.name}". Beschikbare voorraad is ontoereikend.`,
            );
          }
        }

        const itemSubtotal = unitPrice * item.quantity;

        orderItemsData.push({
          productId: product.id,
          variantId: item.variantId,
          productNameSnapshot: product.name,
          variantSnapshot,
          unitPrice,
          quantity: item.quantity,
          subtotalPrice: itemSubtotal,
        });
      }

      // 5. Calculate totals
      const subtotalAmount = orderItemsData.reduce((acc, i) => acc + i.subtotalPrice, 0);
      const deliveryFee = 0; // Default delivery fee for MVP (can be configured via environment)
      const totalAmount = subtotalAmount + deliveryFee;

      // 6. Generate order number (e.g. LS-MMDD-XXXX)
      const orderNumber = this.generateOrderNumber();

      // 7. Create Order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          consumerProfileId: consumerProfile.id,
          businessId: business.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotalAmount,
          deliveryFee,
          totalAmount,
          currency: 'EUR',
          deliveryStreet: dto.deliveryAddress.street,
          deliveryHouseNumber: dto.deliveryAddress.houseNumber || null,
          deliveryCity: dto.deliveryAddress.city,
          deliveryPostalCode: dto.deliveryAddress.postalCode || null,
          deliveryCountry: dto.deliveryAddress.country || 'NL',
          deliveryNotes: dto.deliveryAddress.notes || null,
          latitude: dto.deliveryAddress.latitude ?? null,
          longitude: dto.deliveryAddress.longitude ?? null,
          deliveryAddressSnapshot: dto.deliveryAddress as any,
        },
      });

      // 8. Create OrderItem snapshot records
      for (const item of orderItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productVariantId: item.variantId,
            productNameSnapshot: item.productNameSnapshot,
            variantSnapshot: item.variantSnapshot,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotalPrice: item.subtotalPrice,
          },
        });
      }

      // 9. Create OrderStatusEvent audit entry
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          changedByUserId: user.id,
          reason: 'Bestelling geplaatst via winkelwagen',
        },
      });

      // 10. Clear the consumer's cart items and reset business
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { businessId: null },
      });

      // 11. Return order with items and business details
      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          business: {
            select: { id: true, name: true, slug: true, city: true, phone: true, email: true },
          },
          items: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  // ==========================================
  // GET ORDERS FOR CONSUMER
  // ==========================================
  async getConsumerOrders(user: any, query: OrderQueryDto) {
    const consumerProfile = await this.getConsumerProfile(user);
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      consumerProfileId: consumerProfile.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true, slug: true, city: true },
          },
          items: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // GET ORDERS FOR BUSINESS OWNER
  // ==========================================
  async getBusinessOrders(businessId: string, user: any, query: OrderQueryDto) {
    await this.verifyBusinessOwnership(businessId, user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      businessId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consumerProfile: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: true,
          statusEvents: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // GET SINGLE ORDER BY ID
  // ==========================================
  async getOrderById(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            street: true,
            houseNumber: true,
            postalCode: true,
            phone: true,
            email: true,
            ownerProfileId: true,
          },
        },
        consumerProfile: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: true,
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Bestelling niet gevonden');
    }

    // RBAC Authorization check
    if (user.role === UserRole.SUPER_ADMIN) {
      return order;
    }

    if (user.role === UserRole.CONSUMER) {
      if (order.consumerProfile.userId !== user.id) {
        throw new ForbiddenException('Je hebt geen toegang tot deze bestelling');
      }
      return order;
    }

    if (user.role === UserRole.BUSINESS_OWNER) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!ownerProfile || order.business.ownerProfileId !== ownerProfile.id) {
        throw new ForbiddenException('Je hebt geen toegang tot deze bestelling');
      }
      return order;
    }

    throw new ForbiddenException('Je hebt geen toegang tot deze bestelling');
  }

  // ==========================================
  // UPDATE ORDER STATUS (TRANSITION SYSTEM)
  // ==========================================
  async updateOrderStatus(orderId: string, user: any, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Bestelling niet gevonden');
    }

    // Authorization: only owning business owner or SUPER_ADMIN
    if (user.role !== UserRole.SUPER_ADMIN) {
      await this.verifyBusinessOwnership(order.businessId, user);
    }

    // Normalize ACCEPTED -> CONFIRMED for internal lifecycle
    const targetStatus =
      dto.status === AllowedOrderStatusInput.ACCEPTED
        ? OrderStatus.CONFIRMED
        : (dto.status as OrderStatus);

    // Validate transition
    this.validateStatusTransition(order.status, targetStatus);

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: targetStatus,
      };

      if (targetStatus === OrderStatus.CONFIRMED && !order.confirmedAt) {
        updateData.confirmedAt = new Date();
      } else if (targetStatus === OrderStatus.DELIVERED && !order.deliveredAt) {
        updateData.deliveredAt = new Date();
      } else if (targetStatus === OrderStatus.CANCELLED && !order.cancelledAt) {
        updateData.cancelledAt = new Date();
      }

      // If transitioning to CANCELLED or REJECTED: restore stock
      if (
        targetStatus === OrderStatus.CANCELLED ||
        targetStatus === OrderStatus.REJECTED
      ) {
        await this.restoreOrderStock(tx, order.items);
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          business: { select: { id: true, name: true, slug: true } },
          items: true,
        },
      });

      // Record status transition event
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: targetStatus,
          changedByUserId: user.id,
          reason: dto.reason || `Status gewijzigd naar ${targetStatus}`,
        },
      });

      return updatedOrder;
    });
  }

  // ==========================================
  // CANCEL ORDER
  // ==========================================
  async cancelOrder(orderId: string, user: any, dto: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: true,
        consumerProfile: true,
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Bestelling niet gevonden');
    }

    // Terminal states cannot be cancelled
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Een reeds voltooide, geannuleerde of afgewezen bestelling kan niet worden geannuleerd',
      );
    }

    // Role-specific cancellation policies
    if (user.role === UserRole.CONSUMER) {
      if (order.consumerProfile.userId !== user.id) {
        throw new ForbiddenException('Je kunt alleen je eigen bestellingen annuleren');
      }
      // Consumers can only cancel before PREPARING
      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Bestelling is al in voorbereiding of verzonden en kan niet meer zelfstandig worden geannuleerd. Neem contact op met de winkel.',
        );
      }
    } else if (user.role === UserRole.BUSINESS_OWNER) {
      await this.verifyBusinessOwnership(order.businessId, user);
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Onbevoegd om deze bestelling te annuleren');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore stock
      await this.restoreOrderStock(tx, order.items);

      // 2. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: {
          business: { select: { id: true, name: true, slug: true } },
          items: true,
        },
      });

      // 3. Record status event
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          changedByUserId: user.id,
          reason: dto.reason || 'Bestelling geannuleerd',
        },
      });

      return updatedOrder;
    });
  }

  // ==========================================
  // HELPERS & VALIDATIONS
  // ==========================================

  private validateStatusTransition(current: OrderStatus, target: OrderStatus) {
    if (current === target) {
      return;
    }

    // Terminal states cannot transition
    if (
      current === OrderStatus.DELIVERED ||
      current === OrderStatus.CANCELLED ||
      current === OrderStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Een bestelling met status ${current} is definitief en kan niet meer worden gewijzigd`,
      );
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PREPARING]: [
        OrderStatus.READY,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.READY]: [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.OUT_FOR_DELIVERY]: [
        OrderStatus.DELIVERED,
      ],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Ongeldige statusovergang van ${current} naar ${target}`,
      );
    }
  }

  private async restoreOrderStock(tx: any, items: any[]) {
    for (const item of items) {
      if (item.productVariantId) {
        await tx.$executeRaw`
          UPDATE "product_variants"
          SET "stock" = "stock" + ${item.quantity}, "updated_at" = NOW()
          WHERE "id" = ${item.productVariantId}::uuid
        `;
      } else if (item.productId) {
        await tx.$executeRaw`
          UPDATE "products"
          SET "stock" = "stock" + ${item.quantity}, "updated_at" = NOW()
          WHERE "id" = ${item.productId}::uuid
        `;
      }
    }
  }

  private async getConsumerProfile(user: any) {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new ForbiddenException('Geen consumentenprofiel gevonden voor deze gebruiker');
    }
    return profile;
  }

  private async verifyBusinessOwnership(businessId: string, user: any) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!ownerProfile) {
      throw new ForbiddenException('Geen bedrijfsprofiel gevonden');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    if (business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException('Je bent niet de eigenaar van deze winkel');
    }

    return business;
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LS-${timestamp}-${randomHex}`;
  }
}
