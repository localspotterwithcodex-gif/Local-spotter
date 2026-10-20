import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { EmployeesService } from '../employees/employees.service';
import { PaymentsService } from '../payments/payments.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BusinessStatus, FulfilmentMethod, OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { AllowedOrderStatusInput } from './dto/update-order-status.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let entitlementService: any;
  let employees: any;
  let payments: any;
  let notifications: any;

  const consumer = { id: 'user-consumer-1', role: UserRole.CONSUMER };
  const otherConsumer = { id: 'user-consumer-2', role: UserRole.CONSUMER };
  const owner = { id: 'user-owner-1', role: UserRole.BUSINESS_OWNER };
  const admin = { id: 'user-admin', role: UserRole.SUPER_ADMIN };
  const consumerProfile = { id: 'consumer-profile-1', userId: 'user-consumer-1', displayName: 'Jan' };
  const ownerProfile = { id: 'owner-profile-1', userId: 'user-owner-1' };

  const shop = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    ownerProfileId: 'owner-profile-1',
    name: `Shop ${id}`,
    slug: id,
    city: 'Amsterdam',
    status: BusinessStatus.ACTIVE,
    deletedAt: null,
    latitude: null,
    longitude: null,
    pickupEnabled: true,
    shippingEnabled: true,
    localDeliveryEnabled: false,
    shippingFee: 4.95,
    freeShippingThreshold: null,
    localDeliveryFee: 0,
    localDeliveryRadiusKm: null,
    ...extra,
  });

  const cartItem = (id: string, business: any, price: number, quantity: number) => ({
    id,
    productId: `prod-${id}`,
    variantId: null,
    quantity,
    variant: null,
    product: { id: `prod-${id}`, name: `Product ${id}`, price, active: true, deletedAt: null, businessId: business.id, business },
  });

  const address = { street: 'Prinsengracht', houseNumber: '100', city: 'Amsterdam', postalCode: '1015 DZ', country: 'NL' };

  beforeEach(async () => {
    let orderSeq = 0;
    prisma = {
      consumerProfile: { findUnique: jest.fn().mockResolvedValue(consumerProfile) },
      businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue(ownerProfile) },
      business: { findUnique: jest.fn() },
      customerOrder: {
        create: jest.fn().mockResolvedValue({ id: 'co-1' }),
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'co-1', orders: [] }),
      },
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: `order-${++orderSeq}`, ...data })),
        update: jest.fn().mockResolvedValue({ id: 'order-1' }),
      },
      orderItem: { createMany: jest.fn() },
      orderStatusEvent: { create: jest.fn() },
      cart: { findUnique: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    entitlementService = { hasFeature: jest.fn().mockResolvedValue(true) };
    employees = { canAccessShop: jest.fn().mockResolvedValue(false), isActiveStaff: jest.fn().mockResolvedValue(false) };
    payments = { refundOrder: jest.fn().mockResolvedValue({ status: 'NOT_REQUIRED', refundedCents: 0 }) };
    notifications = { notifyUser: jest.fn().mockResolvedValue(undefined), notifyBusinessOwner: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
        { provide: NotificationsService, useValue: notifications },
        { provide: EmployeesService, useValue: employees },
        { provide: PaymentsService, useValue: payments },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  describe('createOrderFromCart', () => {
    it('rejects an empty cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });
      await expect(service.createOrderFromCart(consumer, { deliveryAddress: address })).rejects.toThrow(BadRequestException);
    });

    it('rejects a store without an active webshop plan', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1'), 25, 2)] });
      entitlementService.hasFeature.mockResolvedValue(false);
      await expect(service.createOrderFromCart(consumer, { deliveryAddress: address })).rejects.toThrow(ForbiddenException);
    });

    it('fails with a conflict when stock cannot be reserved', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1'), 25, 5)] });
      prisma.$executeRaw.mockResolvedValue(0);
      await expect(service.createOrderFromCart(consumer, { deliveryAddress: address })).rejects.toThrow(ConflictException);
    });

    it('splits a multi-store cart into one customer order with one order per store', async () => {
      const s1 = shop('s1');
      const s2 = shop('s2', { shippingFee: 0 });
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [cartItem('1', s1, 75, 2), cartItem('2', s2, 10, 1), cartItem('3', s1, 5, 1)],
      });

      await service.createOrderFromCart(consumer, {
        deliveryAddress: address,
        fulfilments: [
          { businessId: 's1', method: FulfilmentMethod.SHIPPING },
          { businessId: 's2', method: FulfilmentMethod.PICKUP },
        ],
      });

      expect(prisma.customerOrder.create).toHaveBeenCalledTimes(1);
      expect(prisma.order.create).toHaveBeenCalledTimes(2);
      const [first, second] = prisma.order.create.mock.calls.map((c: any) => c[0].data);
      expect(first).toMatchObject({ businessId: 's1', customerOrderId: 'co-1', subtotalAmount: 155, deliveryFee: 4.95, totalAmount: 159.95, fulfilmentMethod: 'SHIPPING', deliveryCity: 'Amsterdam' });
      expect(second).toMatchObject({ businessId: 's2', subtotalAmount: 10, deliveryFee: 0, totalAmount: 10, fulfilmentMethod: 'PICKUP', deliveryStreet: null, deliveryCity: null });
      expect(prisma.customerOrder.update).toHaveBeenCalledWith({ where: { id: 'co-1' }, data: { totalAmount: 169.95 } });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      // Stock is reserved per item; notifications to the stores wait for the payment.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
      expect(notifications.notifyBusinessOwner).not.toHaveBeenCalled();
    });

    it('needs no address when every store is picked up', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1'), 20, 1)] });
      await service.createOrderFromCart(consumer, { fulfilments: [{ businessId: 's1', method: FulfilmentMethod.PICKUP }] });
      expect(prisma.order.create.mock.calls[0][0].data).toMatchObject({ fulfilmentMethod: 'PICKUP', totalAmount: 20, deliveryStreet: null });
    });

    it('requires an address for shipping (the default method)', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1'), 20, 1)] });
      await expect(service.createOrderFromCart(consumer, {})).rejects.toThrow(BadRequestException);
    });

    it('rejects a fulfilment method the shop does not offer', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1', { pickupEnabled: false }), 20, 1)] });
      await expect(
        service.createOrderFromCart(consumer, { fulfilments: [{ businessId: 's1', method: FulfilmentMethod.PICKUP }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a fulfilment choice for a store that is not in the cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', shop('s1'), 20, 1)] });
      await expect(
        service.createOrderFromCart(consumer, { deliveryAddress: address, fulfilments: [{ businessId: 'other', method: FulfilmentMethod.PICKUP }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies free shipping above the threshold and the local-delivery town rule', async () => {
      const s1 = shop('s1', { freeShippingThreshold: 100 });
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', s1, 60, 2)] });
      await service.createOrderFromCart(consumer, { deliveryAddress: address });
      expect(prisma.order.create.mock.calls[0][0].data).toMatchObject({ deliveryFee: 0, totalAmount: 120 });

      const local = shop('s1', { localDeliveryEnabled: true, localDeliveryFee: 3 });
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [cartItem('1', local, 10, 1)] });
      await expect(
        service.createOrderFromCart(consumer, { deliveryAddress: { ...address, city: 'Rotterdam' }, fulfilments: [{ businessId: 's1', method: FulfilmentMethod.LOCAL_DELIVERY }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrderById & authorization', () => {
    const record = (extra: Record<string, unknown> = {}) => ({
      id: 'order-1',
      businessId: 'bus-1',
      customerOrderId: 'co-1',
      paymentStatus: PaymentStatus.PAID,
      consumerProfile: { userId: 'user-consumer-1' },
      business: { ownerProfileId: 'owner-profile-1' },
      ...extra,
    });

    it('lets the ordering customer see the order, paid or not', async () => {
      prisma.order.findUnique.mockResolvedValue(record({ paymentStatus: PaymentStatus.PENDING }));
      await expect(service.getOrderById('order-1', consumer)).resolves.toBeDefined();
    });

    it('refuses another customer', async () => {
      prisma.order.findUnique.mockResolvedValue(record());
      await expect(service.getOrderById('order-1', otherConsumer)).rejects.toThrow(ForbiddenException);
    });

    it('lets the shop owner and an employee see a paid order', async () => {
      prisma.order.findUnique.mockResolvedValue(record());
      employees.canAccessShop.mockResolvedValue(true);
      await expect(service.getOrderById('order-1', owner)).resolves.toBeDefined();
      await expect(service.getOrderById('order-1', otherConsumer)).resolves.toBeDefined();
    });

    it('hides an unpaid checkout order from the shop', async () => {
      prisma.order.findUnique.mockResolvedValue(record({ paymentStatus: PaymentStatus.PENDING }));
      employees.canAccessShop.mockResolvedValue(true);
      await expect(service.getOrderById('order-1', owner)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBusinessOrders', () => {
    it('only lists paid orders (plus orders from before payments existed)', async () => {
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
      await service.getBusinessOrders('bus-1', owner, {} as any);
      const where = prisma.order.findMany.mock.calls[0][0].where;
      expect(where.businessId).toBe('bus-1');
      expect(where.OR).toEqual([{ customerOrderId: null }, { paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } }]);
    });

    it('refuses a customer who is not an employee of the shop', async () => {
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
      await expect(service.getBusinessOrders('bus-1', otherConsumer, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('lets an active employee list the orders', async () => {
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
      employees.isActiveStaff.mockResolvedValue(true);
      await expect(service.getBusinessOrders('bus-1', otherConsumer, {} as any)).resolves.toBeDefined();
    });
  });

  describe('updateOrderStatus', () => {
    const base = (extra: Record<string, unknown> = {}) => ({
      id: 'order-1',
      orderNumber: 'LS-1-1',
      businessId: 'bus-1',
      consumerProfileId: 'consumer-profile-1',
      customerOrderId: 'co-1',
      fulfilmentMethod: FulfilmentMethod.SHIPPING,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      items: [{ productId: 'p', productVariantId: null, quantity: 1 }],
      ...extra,
    });

    beforeEach(() => {
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
    });

    it('accepts a paid order and tells the customer', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      await service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.ACCEPTED });
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: OrderStatus.CONFIRMED }) }));
      expect(notifications.notifyUser).toHaveBeenCalledWith('user-consumer-1', 'ORDER', 'Bestelling geaccepteerd', expect.any(String), expect.any(Object));
    });

    it('refuses to process an unpaid order', async () => {
      prisma.order.findUnique.mockResolvedValue(base({ paymentStatus: PaymentStatus.PENDING }));
      await expect(service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.CONFIRMED })).rejects.toThrow(ConflictException);
    });

    it('lets an employee update the status', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      employees.isActiveStaff.mockResolvedValue(true);
      await expect(service.updateOrderStatus('order-1', otherConsumer, { status: AllowedOrderStatusInput.CONFIRMED })).resolves.toBeDefined();
    });

    it('refuses someone who is not part of the shop', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      await expect(service.updateOrderStatus('order-1', otherConsumer, { status: AllowedOrderStatusInput.CONFIRMED })).rejects.toThrow(ForbiddenException);
    });

    it('rejects invalid transitions and terminal states', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      await expect(service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.DELIVERED })).rejects.toThrow(BadRequestException);
      prisma.order.findUnique.mockResolvedValue(base({ status: OrderStatus.DELIVERED }));
      await expect(service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.PREPARING })).rejects.toThrow(BadRequestException);
    });

    it('does not let a pickup order go out for delivery', async () => {
      prisma.order.findUnique.mockResolvedValue(base({ status: OrderStatus.READY, fulfilmentMethod: FulfilmentMethod.PICKUP }));
      await expect(service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.OUT_FOR_DELIVERY })).rejects.toThrow(BadRequestException);
    });

    it('refunds the customer automatically when the shop rejects a paid order', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      payments.refundOrder.mockResolvedValue({ status: 'REFUNDED', refundedCents: 1500 });
      const result: any = await service.updateOrderStatus('order-1', owner, { status: AllowedOrderStatusInput.REJECTED, reason: 'Uitverkocht' });
      expect(payments.refundOrder).toHaveBeenCalledWith('order-1', 'Uitverkocht');
      expect(result.refund).toEqual({ status: 'REFUNDED', refundedCents: 1500 });
      expect(prisma.$executeRaw).toHaveBeenCalled(); // stock restored
    });
  });

  describe('cancelOrder', () => {
    const base = (extra: Record<string, unknown> = {}) => ({
      id: 'order-1',
      orderNumber: 'LS-1-1',
      businessId: 'bus-1',
      consumerProfileId: 'consumer-profile-1',
      fulfilmentMethod: FulfilmentMethod.SHIPPING,
      status: OrderStatus.PENDING,
      consumerProfile: { userId: 'user-consumer-1' },
      items: [{ productId: 'prod-1', productVariantId: null, quantity: 2 }],
      ...extra,
    });

    it('lets the customer cancel before preparation, restores stock and refunds', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      payments.refundOrder.mockResolvedValue({ status: 'REFUNDED', refundedCents: 2000 });
      const result: any = await service.cancelOrder('order-1', consumer, { reason: 'Verkeerd artikel' });
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: OrderStatus.CANCELLED }) }));
      expect(payments.refundOrder).toHaveBeenCalledWith('order-1', 'Verkeerd artikel');
      expect(result.refund.status).toBe('REFUNDED');
    });

    it('prevents the customer from cancelling an order in preparation', async () => {
      prisma.order.findUnique.mockResolvedValue(base({ status: OrderStatus.PREPARING }));
      await expect(service.cancelOrder('order-1', consumer, {})).rejects.toThrow(BadRequestException);
    });

    it('refuses another customer', async () => {
      prisma.order.findUnique.mockResolvedValue(base());
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
      await expect(service.cancelOrder('order-1', otherConsumer, {})).rejects.toThrow(ForbiddenException);
    });

    it('lets the shop cancel an order that is in preparation', async () => {
      prisma.order.findUnique.mockResolvedValue(base({ status: OrderStatus.PREPARING }));
      prisma.business.findUnique.mockResolvedValue(shop('bus-1'));
      await expect(service.cancelOrder('order-1', owner, {})).resolves.toBeDefined();
      await expect(service.cancelOrder('order-1', admin, {})).resolves.toBeDefined();
    });
  });
});
