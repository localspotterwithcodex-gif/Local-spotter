import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AllowedOrderStatusInput, UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { BusinessStatus, FulfilmentMethod, NotificationType, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { EmployeesService } from '../employees/employees.service';
import { PaymentsService } from '../payments/payments.service';
import { quoteFulfilment, requiresAddress } from './fulfilment';

/** Payment states in which a store may see and process an order. */
const PAID_STATES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];

/** Orders of a checkout that is still unpaid stay hidden from the stores (orders without a checkout predate payments). */
const VISIBLE_TO_STORE = { OR: [{ customerOrderId: null }, { paymentStatus: { in: PAID_STATES } }] };

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
    private notifications: NotificationsService,
    private employees: EmployeesService,
    private payments: PaymentsService,
  ) {}

  // ==========================================
  // CREATE ORDER FROM CART (CHECKOUT)
  // ==========================================

  /**
   * One checkout = one CustomerOrder (one payment) + one Order per store.
   * Stock is reserved atomically here and released again if the payment is not
   * completed in time (see PaymentsService.expireUnpaidCheckouts). Stores only
   * see their order after it is paid.
   */
  async createOrderFromCart(user: any, dto: CreateOrderDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { consumerProfileId: consumerProfile.id },
        include: {
          items: {
            include: { product: { include: { business: true } }, variant: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Winkelwagen is leeg');
      }

      // Group the cart per store.
      const stores = new Map<string, { business: any; items: typeof cart.items }>();
      for (const item of cart.items) {
        const business = item.product.business;
        const entry = stores.get(business.id) ?? { business, items: [] as typeof cart.items };
        entry.items.push(item);
        stores.set(business.id, entry);
      }

      const methodByStore = new Map<string, FulfilmentMethod>();
      for (const f of dto.fulfilments ?? []) {
        if (!stores.has(f.businessId)) {
          throw new BadRequestException('Leveringswijze opgegeven voor een winkel die niet in je winkelwagen zit');
        }
        methodByStore.set(f.businessId, f.method);
      }
      const methodFor = (businessId: string) => methodByStore.get(businessId) ?? FulfilmentMethod.SHIPPING;

      const needsAddress = [...stores.keys()].some((id) => requiresAddress(methodFor(id)));
      if (needsAddress && !dto.deliveryAddress) {
        throw new BadRequestException('Bezorgadres is verplicht voor verzending of bezorging');
      }

      const customerNumber = this.generateOrderNumber();
      const customerOrder = await tx.customerOrder.create({
        data: { orderNumber: customerNumber, consumerProfileId: consumerProfile.id, paymentStatus: PaymentStatus.PENDING, totalAmount: 0, currency: 'EUR' },
      });

      let grandTotal = 0;
      const createdIds: string[] = [];
      let index = 0;

      for (const [businessId, { business, items }] of stores) {
        index += 1;
        if (business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
          throw new BadRequestException(`De winkel "${business.name}" is momenteel niet actief of niet beschikbaar`);
        }
        const hasProducts = await this.entitlementService.hasFeature(businessId, 'PRODUCTS');
        if (!hasProducts) {
          throw new ForbiddenException(`De winkel "${business.name}" heeft momenteel geen actief webshoppakket om bestellingen te accepteren`);
        }

        const orderItemsData: Array<{
          productId: string;
          variantId: string | null;
          productNameSnapshot: string;
          variantSnapshot: string | null;
          unitPrice: number;
          quantity: number;
          subtotalPrice: number;
        }> = [];

        for (const item of items) {
          const product = item.product;
          if (!product || product.deletedAt || !product.active) {
            throw new BadRequestException(`Product "${product?.name || item.productId}" is niet meer beschikbaar`);
          }

          let unitPrice = Number(product.price);
          let variantSnapshot: string | null = null;

          if (item.variantId) {
            const variant = item.variant;
            if (!variant || variant.productId !== product.id) {
              throw new BadRequestException(`Productvariant voor "${product.name}" is niet meer beschikbaar`);
            }
            if (variant.price !== null && variant.price !== undefined) {
              unitPrice = Number(variant.price);
            }
            const variantParts = [variant.size, variant.color].filter(Boolean);
            variantSnapshot = variantParts.length > 0 ? variantParts.join(' - ') : null;

            const variantDeducted = await tx.$executeRaw`
              UPDATE "product_variants"
              SET "stock" = "stock" - ${item.quantity}, "updated_at" = NOW()
              WHERE "id" = ${item.variantId}::uuid AND "stock" >= ${item.quantity}
            `;
            if (variantDeducted === 0) {
              throw new ConflictException(`Onvoldoende voorraad voor variant (${variantSnapshot}) van product "${product.name}".`);
            }
          } else {
            const productDeducted = await tx.$executeRaw`
              UPDATE "products"
              SET "stock" = "stock" - ${item.quantity}, "updated_at" = NOW()
              WHERE "id" = ${product.id}::uuid AND "stock" >= ${item.quantity}
            `;
            if (productDeducted === 0) {
              throw new ConflictException(`Onvoldoende voorraad voor product "${product.name}". Beschikbare voorraad is ontoereikend.`);
            }
          }

          orderItemsData.push({
            productId: product.id,
            variantId: item.variantId,
            productNameSnapshot: product.name,
            variantSnapshot,
            unitPrice,
            quantity: item.quantity,
            subtotalPrice: Math.round(unitPrice * item.quantity * 100) / 100,
          });
        }

        const method = methodFor(businessId);
        const subtotalAmount = Math.round(orderItemsData.reduce((acc, i) => acc + i.subtotalPrice, 0) * 100) / 100;
        const deliveryFee = quoteFulfilment(business, method, subtotalAmount, dto.deliveryAddress);
        const totalAmount = Math.round((subtotalAmount + deliveryFee) * 100) / 100;
        grandTotal += totalAmount;

        const withAddress = requiresAddress(method) && dto.deliveryAddress;
        const order = await tx.order.create({
          data: {
            orderNumber: `${customerNumber}-${index}`,
            customerOrderId: customerOrder.id,
            fulfilmentMethod: method,
            consumerProfileId: consumerProfile.id,
            businessId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            subtotalAmount,
            deliveryFee,
            totalAmount,
            currency: 'EUR',
            deliveryStreet: withAddress ? dto.deliveryAddress!.street : null,
            deliveryHouseNumber: withAddress ? dto.deliveryAddress!.houseNumber || null : null,
            deliveryCity: withAddress ? dto.deliveryAddress!.city : null,
            deliveryPostalCode: withAddress ? dto.deliveryAddress!.postalCode || null : null,
            deliveryCountry: withAddress ? dto.deliveryAddress!.country || 'NL' : 'NL',
            deliveryNotes: withAddress ? dto.deliveryAddress!.notes || null : null,
            latitude: withAddress ? dto.deliveryAddress!.latitude ?? null : null,
            longitude: withAddress ? dto.deliveryAddress!.longitude ?? null : null,
            deliveryAddressSnapshot: withAddress ? (dto.deliveryAddress as any) : undefined,
          },
        });
        createdIds.push(order.id);

        await tx.orderItem.createMany({
          data: orderItemsData.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            productVariantId: item.variantId,
            productNameSnapshot: item.productNameSnapshot,
            variantSnapshot: item.variantSnapshot,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotalPrice: item.subtotalPrice,
          })),
        });

        await tx.orderStatusEvent.create({
          data: { orderId: order.id, fromStatus: null, toStatus: OrderStatus.PENDING, changedByUserId: user.id, reason: 'Bestelling geplaatst via winkelwagen' },
        });
      }

      await tx.customerOrder.update({ where: { id: customerOrder.id }, data: { totalAmount: Math.round(grandTotal * 100) / 100 } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.customerOrder.findUnique({
        where: { id: customerOrder.id },
        include: {
          orders: {
            orderBy: { createdAt: 'asc' },
            include: {
              business: { select: { id: true, name: true, slug: true, city: true, phone: true, email: true } },
              items: true,
            },
          },
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
          customerOrder: { select: { id: true, orderNumber: true, paymentStatus: true, totalAmount: true } },
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
    await this.verifyBusinessAccess(businessId, user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      businessId,
      ...VISIBLE_TO_STORE,
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
        customerOrder: { select: { id: true, orderNumber: true, paymentStatus: true, totalAmount: true } },
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

    // The ordering customer always sees their order (including its payment state).
    if (user.role === UserRole.CONSUMER && order.consumerProfile.userId === user.id) {
      return order;
    }

    // Shop side (owner or employee): only once the order is paid.
    if (user.role === UserRole.CONSUMER || user.role === UserRole.BUSINESS_OWNER) {
      if (await this.canAccessShop(user, order.businessId)) {
        if (order.customerOrderId && !PAID_STATES.includes(order.paymentStatus)) {
          throw new NotFoundException('Bestelling niet gevonden');
        }
        return order;
      }
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

    // Authorization: owning business owner, an employee of the shop, or SUPER_ADMIN
    await this.verifyBusinessAccess(order.businessId, user);

    // Normalize ACCEPTED -> CONFIRMED for internal lifecycle
    const targetStatus =
      dto.status === AllowedOrderStatusInput.ACCEPTED
        ? OrderStatus.CONFIRMED
        : (dto.status as OrderStatus);

    // Validate transition
    this.validateStatusTransition(order.status, targetStatus);

    const isRelease = targetStatus === OrderStatus.CANCELLED || targetStatus === OrderStatus.REJECTED;
    if (!isRelease && order.customerOrderId && !PAID_STATES.includes(order.paymentStatus)) {
      throw new ConflictException('Deze bestelling is nog niet betaald en kan nog niet worden verwerkt');
    }
    if (targetStatus === OrderStatus.OUT_FOR_DELIVERY && order.fulfilmentMethod === FulfilmentMethod.PICKUP) {
      throw new BadRequestException('Een bestelling om af te halen kan niet "onderweg" zijn');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
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

    const refund = isRelease ? await this.payments.refundOrder(orderId, dto.reason || `Bestelling ${targetStatus === OrderStatus.REJECTED ? 'afgewezen' : 'geannuleerd'} door de winkel`) : undefined;
    await this.notifyStatus(order.consumerProfileId, order.orderNumber, order.fulfilmentMethod, targetStatus, refund?.status);
    return refund ? { ...updated, refund } : updated;
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
    const isOwnCustomerOrder = user.role === UserRole.CONSUMER && order.consumerProfile.userId === user.id;
    if (isOwnCustomerOrder) {
      // Consumers can only cancel before PREPARING
      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          'Bestelling is al in voorbereiding of verzonden en kan niet meer zelfstandig worden geannuleerd. Neem contact op met de winkel.',
        );
      }
    } else {
      // Shop owner, employee or admin; anyone else (including other customers) is refused.
      await this.verifyBusinessAccess(order.businessId, user);
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
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

    const refund = await this.payments.refundOrder(orderId, dto.reason || 'Bestelling geannuleerd');
    await this.notifyStatus(order.consumerProfileId, order.orderNumber, order.fulfilmentMethod, OrderStatus.CANCELLED, refund.status);
    return { ...cancelled, refund };
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

  private canAccessShop(user: any, businessId: string): Promise<boolean> {
    return this.employees.canAccessShop(
      { id: user.id, email: user.email ?? '', role: user.role, profileId: user.profileId ?? null } as any,
      businessId,
    );
  }

  /** Owner, admin or an active employee of the shop (orders are part of the employee scope). */
  private async verifyBusinessAccess(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }
    if (user.role === UserRole.SUPER_ADMIN) return business;

    if (user.role === UserRole.BUSINESS_OWNER) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } });
      if (ownerProfile && business.ownerProfileId === ownerProfile.id) return business;
      throw new ForbiddenException('Je bent niet de eigenaar van deze winkel');
    }
    if (user.role === UserRole.CONSUMER && (await this.employees.isActiveStaff(user.id, businessId))) {
      return business;
    }
    throw new ForbiddenException('Je hebt geen toegang tot deze winkel');
  }

  /** Customer notification for a status change. Best effort; never blocks the status change. */
  private async notifyStatus(
    consumerProfileId: string,
    orderNumber: string,
    method: FulfilmentMethod,
    status: OrderStatus,
    refundStatus?: 'REFUNDED' | 'NOT_REQUIRED' | 'FAILED',
  ) {
    const pickup = method === FulfilmentMethod.PICKUP;
    const texts: Partial<Record<OrderStatus, [string, string, boolean]>> = {
      [OrderStatus.CONFIRMED]: ['Bestelling geaccepteerd', `De winkel heeft bestelling ${orderNumber} geaccepteerd.`, false],
      [OrderStatus.PREPARING]: ['Bestelling in voorbereiding', `Bestelling ${orderNumber} wordt klaargemaakt.`, false],
      [OrderStatus.READY]: [pickup ? 'Klaar om af te halen' : 'Bestelling klaar', pickup ? `Bestelling ${orderNumber} ligt klaar om af te halen.` : `Bestelling ${orderNumber} is klaar voor verzending.`, true],
      [OrderStatus.OUT_FOR_DELIVERY]: ['Bestelling onderweg', `Bestelling ${orderNumber} is onderweg.`, true],
      [OrderStatus.DELIVERED]: [pickup ? 'Bestelling opgehaald' : 'Bestelling afgeleverd', `Bestelling ${orderNumber} is voltooid.`, false],
      [OrderStatus.CANCELLED]: ['Bestelling geannuleerd', `Bestelling ${orderNumber} is geannuleerd.${refundStatus === 'REFUNDED' ? ' Het bedrag wordt terugbetaald.' : refundStatus === 'FAILED' ? ' De terugbetaling wordt handmatig afgehandeld.' : ''}`, true],
      [OrderStatus.REJECTED]: ['Bestelling afgewezen', `De winkel kan bestelling ${orderNumber} helaas niet leveren.${refundStatus === 'REFUNDED' ? ' Het bedrag wordt terugbetaald.' : refundStatus === 'FAILED' ? ' De terugbetaling wordt handmatig afgehandeld.' : ''}`, true],
    };
    const entry = texts[status];
    if (!entry) return;
    try {
      const profile = await this.prisma.consumerProfile.findUnique({ where: { id: consumerProfileId }, select: { userId: true } });
      if (profile) {
        await this.notifications.notifyUser(profile.userId, NotificationType.ORDER, entry[0], entry[1], { linkUrl: '/account/orders', email: entry[2] });
      }
    } catch {
      /* best effort */
    }
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LS-${timestamp}-${randomHex}`;
  }
}
