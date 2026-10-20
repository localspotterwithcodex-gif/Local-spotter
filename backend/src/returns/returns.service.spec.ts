import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ReturnsService } from './returns.service';

const consumer = { id: 'u1', role: UserRole.CONSUMER, profileId: 'cp1' } as any;
const owner = { id: 'o1', role: UserRole.BUSINESS_OWNER, profileId: 'op1' } as any;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

const orderRow = (over: any = {}) => ({
  id: 'ord1',
  consumerProfileId: 'cp1',
  businessId: 'b1',
  status: 'DELIVERED',
  paymentStatus: 'PAID',
  deliveredAt: daysAgo(2),
  deliveryFee: '4.95',
  items: [
    { id: 'oi1', quantity: 2, productNameSnapshot: 'Vaas' },
    { id: 'oi2', quantity: 1, productNameSnapshot: 'Kaars' },
  ],
  ...over,
});

const retRow = (over: any = {}) => ({
  id: 'r1',
  returnNumber: 'RET-1',
  orderId: 'ord1',
  businessId: 'b1',
  consumerProfileId: 'cp1',
  status: 'REQUESTED',
  reason: 'kapot',
  merchantNote: null,
  refundStatus: null,
  refundAmountCents: null,
  restocked: false,
  requestedAt: new Date(),
  decidedAt: null,
  receivedAt: null,
  refundedAt: null,
  order: { orderNumber: 'LS-1', deliveredAt: daysAgo(2) },
  business: { id: 'b1', name: 'Bloemen' },
  consumerProfile: { displayName: 'Jan' },
  items: [{ orderItemId: 'oi1', quantity: 1, orderItem: { productNameSnapshot: 'Vaas', variantSnapshot: null, unitPrice: '25.00' } }],
  ...over,
});

function make(config: Record<string, string> = {}) {
  const prisma: any = {
    consumerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'cp1', userId: 'u1' }) },
    order: { findUnique: jest.fn().mockResolvedValue(orderRow()) },
    returnItem: { findMany: jest.fn().mockResolvedValue([]) },
    returnRequest: {
      create: jest.fn().mockImplementation(async ({ data }: any) => retRow({ returnNumber: data.returnNumber })),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(retRow()),
      findUnique: jest.fn().mockResolvedValue(retRow()),
      findUniqueOrThrow: jest.fn().mockResolvedValue(retRow()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', deletedAt: null, ownerProfile: { userId: 'o1' } }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
  const notifications: any = { notifyUser: jest.fn().mockResolvedValue(undefined) };
  const employees: any = { canAccessShop: jest.fn().mockResolvedValue(true) };
  const payments: any = { refundOrder: jest.fn().mockResolvedValue({ status: 'REFUNDED', refundedCents: 2500 }) };
  const svc = new ReturnsService(prisma, { get: (k: string) => config[k] } as any, notifications, employees, payments);
  return { svc, prisma, notifications, employees, payments };
}

const dto = (items = [{ orderItemId: 'oi1', quantity: 1 }]) => ({ orderId: 'ord1', reason: 'Beschadigd', items });

describe('ReturnsService.create', () => {
  it('creates a return for a delivered, paid order and tells the shop', async () => {
    const { svc, prisma, notifications } = make();
    const out = await svc.create(consumer, dto());
    expect(prisma.$queryRaw).toHaveBeenCalled(); // order row lock
    expect(prisma.returnRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderId: 'ord1', businessId: 'b1', consumerProfileId: 'cp1', items: { create: [{ orderItemId: 'oi1', quantity: 1 }] } }) }),
    );
    expect(out.status).toBe('REQUESTED');
    expect(notifications.notifyUser).toHaveBeenCalledWith('o1', 'RETURN', expect.any(String), expect.any(String), expect.any(Object));
  });

  it("refuses another customer's order (no information leak)", async () => {
    const { svc, prisma } = make();
    prisma.order.findUnique.mockResolvedValue(orderRow({ consumerProfileId: 'someone-else' }));
    await expect(svc.create(consumer, dto())).rejects.toThrow(NotFoundException);
  });

  it('only accepts delivered and paid orders', async () => {
    const a = make();
    a.prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'READY' }));
    await expect(a.svc.create(consumer, dto())).rejects.toThrow(/afgeleverde/);
    const b = make();
    b.prisma.order.findUnique.mockResolvedValue(orderRow({ paymentStatus: 'PENDING' }));
    await expect(b.svc.create(consumer, dto())).rejects.toThrow(/niet betaald/);
  });

  it('enforces the return window (default 14 days, RETURN_WINDOW_DAYS overrides)', async () => {
    const late = make();
    late.prisma.order.findUnique.mockResolvedValue(orderRow({ deliveredAt: daysAgo(15) }));
    await expect(late.svc.create(consumer, dto())).rejects.toThrow(/14 dagen/);
    const custom = make({ RETURN_WINDOW_DAYS: '30' });
    custom.prisma.order.findUnique.mockResolvedValue(orderRow({ deliveredAt: daysAgo(20) }));
    await expect(custom.svc.create(consumer, dto())).resolves.toBeDefined();
  });

  it('cannot return more than ordered, counting open returns, and rejects foreign or duplicate items', async () => {
    const { svc, prisma } = make();
    prisma.returnItem.findMany.mockResolvedValue([{ orderItemId: 'oi1', quantity: 1 }]);
    await expect(svc.create(consumer, dto([{ orderItemId: 'oi1', quantity: 2 }]))).rejects.toThrow(/nog 1 stuk/);
    await expect(svc.create(consumer, dto([{ orderItemId: 'zzz', quantity: 1 }]))).rejects.toThrow(BadRequestException);
    await expect(svc.create(consumer, dto([{ orderItemId: 'oi1', quantity: 1 }, { orderItemId: 'oi1', quantity: 1 }]))).rejects.toThrow(/één keer/);
    expect(prisma.returnRequest.create).not.toHaveBeenCalled();
  });

  it('only counts quantity-holding returns (rejected/cancelled ones free the quantity)', async () => {
    const { svc, prisma } = make();
    await svc.create(consumer, dto());
    const where = prisma.returnItem.findMany.mock.calls[0][0].where;
    expect(where.returnRequest.status.in).toEqual(['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED']);
  });

  it('is for customers only', async () => {
    await expect(make().svc.create(owner, dto())).rejects.toThrow(ForbiddenException);
  });
});

describe('ReturnsService consumer reads and cancel', () => {
  it("scopes reads to the caller's profile", async () => {
    const { svc, prisma } = make();
    await svc.listMine(consumer, 'ord1');
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { consumerProfileId: 'cp1', orderId: 'ord1' } }));
    prisma.returnRequest.findFirst.mockResolvedValue(null);
    await expect(svc.getMine(consumer, 'r1')).rejects.toThrow(NotFoundException);
  });

  it('cancels only undecided returns', async () => {
    const { svc, prisma } = make();
    await svc.cancel(consumer, 'r1');
    expect(prisma.returnRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', consumerProfileId: 'cp1', status: 'REQUESTED' },
      data: expect.objectContaining({ status: 'CANCELLED' }),
    });
    prisma.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.cancel(consumer, 'r1')).rejects.toThrow(ConflictException);
  });
});

describe('ReturnsService shop actions', () => {
  it('blocks users without shop access on every shop action', async () => {
    const { svc, employees } = make();
    employees.canAccessShop.mockResolvedValue(false);
    await expect(svc.listForBusiness(consumer, 'b1')).rejects.toThrow(ForbiddenException);
    await expect(svc.decide(consumer, 'r1', { decision: 'APPROVE' })).rejects.toThrow(ForbiddenException);
    await expect(svc.markReceived(consumer, 'r1', {})).rejects.toThrow(ForbiddenException);
    await expect(svc.retryRefund(consumer, 'r1')).rejects.toThrow(ForbiddenException);
  });

  it('approves once; a second decision conflicts; rejecting needs a reason', async () => {
    const { svc, prisma, notifications } = make();
    await svc.decide(owner, 'r1', { decision: 'APPROVE' });
    expect(prisma.returnRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'REQUESTED' },
      data: expect.objectContaining({ status: 'APPROVED', decidedByUserId: 'o1' }),
    });
    expect(notifications.notifyUser).toHaveBeenCalledWith('u1', 'RETURN', 'Retour goedgekeurd', expect.any(String), expect.any(Object));
    await expect(svc.decide(owner, 'r1', { decision: 'REJECT' })).rejects.toThrow(/reden/);
    prisma.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.decide(owner, 'r1', { decision: 'REJECT', note: 'nee' })).rejects.toThrow(ConflictException);
  });
});

describe('ReturnsService.markReceived', () => {
  const received = () => {
    const ctx = make();
    ctx.prisma.returnRequest.findUnique.mockResolvedValue(retRow({ status: 'APPROVED' }));
    ctx.prisma.returnItem.findMany.mockResolvedValue([{ quantity: 1, orderItem: { productVariantId: 'v1', productId: 'p1' } }]);
    ctx.prisma.returnRequest.findUniqueOrThrow.mockResolvedValue({
      ...retRow({ status: 'RECEIVED' }),
      items: [{ orderItemId: 'oi1', quantity: 1, orderItem: { unitPrice: '25.00' } }],
      order: { deliveryFee: '4.95', items: [{ id: 'oi1', quantity: 2 }, { id: 'oi2', quantity: 1 }] },
    });
    return ctx;
  };

  it('refunds the returned items (no delivery fee for a partial return) with a unique idempotency key', async () => {
    const { svc, prisma, payments, notifications } = received();
    await svc.markReceived(owner, 'r1', { restock: true });
    expect(payments.refundOrder).toHaveBeenCalledWith('ord1', 'Retour RET-1', 2500, expect.stringMatching(/^return-r1-/));
    expect(prisma.returnRequest.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'REFUNDED', refundStatus: 'REFUNDED', refundAmountCents: 2500 }),
    });
    expect(notifications.notifyUser).toHaveBeenCalledWith('u1', 'RETURN', 'Retour terugbetaald', expect.any(String), expect.any(Object));
  });

  it('puts returned goods back in stock only when asked', async () => {
    const yes = received();
    await yes.svc.markReceived(owner, 'r1', { restock: true });
    expect(yes.prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const no = received();
    await no.svc.markReceived(owner, 'r1', {});
    expect(no.prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('keeps the return RECEIVED with refundStatus FAILED when the refund fails, so it can be retried', async () => {
    const { svc, prisma, payments } = received();
    payments.refundOrder.mockResolvedValue({ status: 'FAILED', refundedCents: 0 });
    await svc.markReceived(owner, 'r1', {});
    expect(prisma.returnRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { refundStatus: 'FAILED', refundAmountCents: 2500 } });
  });

  it('does not touch stock or refund when the return is not APPROVED', async () => {
    const { svc, prisma, payments } = received();
    prisma.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.markReceived(owner, 'r1', { restock: true })).rejects.toThrow(ConflictException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(payments.refundOrder).not.toHaveBeenCalled();
  });

  it('never throws when the payment layer throws; the failure is recorded for a retry', async () => {
    const { svc, prisma, payments } = received();
    payments.refundOrder.mockRejectedValue(new Error('boom'));
    await expect(svc.markReceived(owner, 'r1', {})).resolves.toBeDefined();
    expect(prisma.returnRequest.updateMany).toHaveBeenCalledWith({ where: { id: 'r1', status: 'RECEIVED' }, data: { refundStatus: 'FAILED' } });
  });
});

describe('ReturnsService.retryRefund', () => {
  it('claims only failed (or long-stuck pending) refunds', async () => {
    const { svc, prisma } = make();
    prisma.returnRequest.findUniqueOrThrow.mockResolvedValue({
      ...retRow({ status: 'RECEIVED' }),
      items: [{ orderItemId: 'oi1', quantity: 1, orderItem: { unitPrice: '25.00' } }],
      order: { deliveryFee: '0', items: [{ id: 'oi1', quantity: 2 }] },
    });
    await svc.retryRefund(owner, 'r1');
    const claim = prisma.returnRequest.updateMany.mock.calls[0][0];
    expect(claim.where.status).toBe('RECEIVED');
    expect(claim.where.OR[0]).toEqual({ refundStatus: 'FAILED' });
    expect(claim.where.OR[1].refundStatus).toBe('PENDING');
    prisma.returnRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.retryRefund(owner, 'r1')).rejects.toThrow(ConflictException);
  });
});
