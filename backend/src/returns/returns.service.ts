import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, OrderStatus, PaymentStatus, Prisma, ReturnStatus, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthUser } from '../common/types/auth-user';
import { EmployeesService } from '../employees/employees.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService, toCents } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto, DecideReturnDto, ReceiveReturnDto } from './dto/returns.dto';
import { QUANTITY_HOLDING_STATUSES, computeReturnRefundCents } from './refund';

export const DEFAULT_RETURN_WINDOW_DAYS = 14;
const STUCK_REFUND_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const returnInclude = {
  items: { include: { orderItem: { select: { productNameSnapshot: true, variantSnapshot: true, unitPrice: true } } } },
  order: { select: { orderNumber: true, deliveredAt: true } },
  business: { select: { id: true, name: true } },
  consumerProfile: { select: { displayName: true } },
} satisfies Prisma.ReturnRequestInclude;

type ReturnRow = Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>;

const eur = (cents: number) => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

/**
 * Returns (RMA): consumer requests -> shop approves/rejects -> shop confirms receipt -> automatic refund
 * through the order's payment (commission is reversed by the payments ledger). Guests can return too.
 */
@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly employees: EmployeesService,
    private readonly payments: PaymentsService,
  ) {}

  private windowDays(): number {
    const raw = Number(this.config.get<string>('RETURN_WINDOW_DAYS'));
    return Number.isInteger(raw) && raw >= 1 ? raw : DEFAULT_RETURN_WINDOW_DAYS;
  }

  // ---------------- consumer ----------------

  async create(user: AuthUser, dto: CreateReturnDto) {
    const profile = await this.profileOf(user);
    const ids = dto.items.map((i) => i.orderItemId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Elk product mag maar één keer voorkomen');

    const created = await this.prisma.$transaction(async (tx) => {
      // Serialises concurrent return requests for the same order (quantity check below).
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${dto.orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id: dto.orderId }, include: { items: true } });
      if (!order || order.consumerProfileId !== profile.id) throw new NotFoundException('Bestelling niet gevonden');
      if (order.status !== OrderStatus.DELIVERED || !order.deliveredAt) {
        throw new BadRequestException('Alleen afgeleverde bestellingen kunnen worden geretourneerd');
      }
      if (order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED) {
        throw new BadRequestException('Deze bestelling is niet betaald');
      }
      if (Date.now() - order.deliveredAt.getTime() > this.windowDays() * DAY_MS) {
        throw new BadRequestException(`De retourtermijn van ${this.windowDays()} dagen is verstreken`);
      }

      const held = await this.heldQuantities(tx, order.id);
      const byId = new Map(order.items.map((i) => [i.id, i]));
      for (const input of dto.items) {
        const item = byId.get(input.orderItemId);
        if (!item) throw new BadRequestException('Product hoort niet bij deze bestelling');
        const left = item.quantity - (held.get(item.id) ?? 0);
        if (input.quantity > left) {
          throw new BadRequestException(`Van "${item.productNameSnapshot}" kun je nog ${Math.max(0, left)} stuk(s) retourneren`);
        }
      }

      return tx.returnRequest.create({
        data: {
          returnNumber: this.newReturnNumber(),
          orderId: order.id,
          consumerProfileId: profile.id,
          businessId: order.businessId,
          reason: dto.reason.trim(),
          items: { create: dto.items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })) },
        },
        include: returnInclude,
      });
    });

    await this.notifyOwner(created.businessId, 'Nieuwe retouraanvraag', `Retour ${created.returnNumber} voor bestelling ${created.order.orderNumber} wacht op je beoordeling.`);
    return this.view(created);
  }

  async listMine(user: AuthUser, orderId?: string) {
    const profile = await this.profileOf(user);
    const rows = await this.prisma.returnRequest.findMany({
      where: { consumerProfileId: profile.id, ...(orderId ? { orderId } : {}) },
      orderBy: { requestedAt: 'desc' },
      take: 100,
      include: returnInclude,
    });
    return rows.map((r) => this.view(r));
  }

  async getMine(user: AuthUser, id: string) {
    const profile = await this.profileOf(user);
    const row = await this.prisma.returnRequest.findFirst({ where: { id, consumerProfileId: profile.id }, include: returnInclude });
    if (!row) throw new NotFoundException('Retour niet gevonden');
    return this.view(row);
  }

  async cancel(user: AuthUser, id: string) {
    const profile = await this.profileOf(user);
    const moved = await this.prisma.returnRequest.updateMany({
      where: { id, consumerProfileId: profile.id, status: ReturnStatus.REQUESTED },
      data: { status: ReturnStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (moved.count === 0) {
      const exists = await this.prisma.returnRequest.findFirst({ where: { id, consumerProfileId: profile.id }, select: { status: true } });
      if (!exists) throw new NotFoundException('Retour niet gevonden');
      throw new ConflictException('Deze retour kan niet meer worden geannuleerd');
    }
    return this.getMine(user, id);
  }

  // ---------------- shop (owner / employee / admin) ----------------

  async listForBusiness(user: AuthUser, businessId: string, status?: ReturnStatus) {
    await this.assertShopAccess(user, businessId);
    const rows = await this.prisma.returnRequest.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: returnInclude,
    });
    return rows.map((r) => this.view(r));
  }

  async decide(user: AuthUser, id: string, dto: DecideReturnDto) {
    const ret = await this.loadForShop(user, id);
    const approve = dto.decision === 'APPROVE';
    if (!approve && !dto.note?.trim()) throw new BadRequestException('Geef een reden voor de afwijzing');

    const moved = await this.prisma.returnRequest.updateMany({
      where: { id, status: ReturnStatus.REQUESTED },
      data: {
        status: approve ? ReturnStatus.APPROVED : ReturnStatus.REJECTED,
        merchantNote: dto.note?.trim() || null,
        decidedByUserId: user.id,
        decidedAt: new Date(),
      },
    });
    if (moved.count === 0) throw new ConflictException('Deze retour is al beoordeeld');
    await this.audit(user.id, approve ? 'RETURN_APPROVED' : 'RETURN_REJECTED', id);
    await this.notifyConsumer(
      ret.consumerProfileId,
      approve ? 'Retour goedgekeurd' : 'Retour afgewezen',
      approve
        ? `Je retour ${ret.returnNumber} is goedgekeurd. Stuur de producten terug naar de winkel; na ontvangst volgt de terugbetaling.`
        : `Je retour ${ret.returnNumber} is afgewezen: ${dto.note?.trim()}`,
    );
    return this.byId(id);
  }

  /** The shop has the goods back: optionally restock, then refund automatically. */
  async markReceived(user: AuthUser, id: string, dto: ReceiveReturnDto) {
    const ret = await this.loadForShop(user, id);
    const lines = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.returnRequest.updateMany({
        where: { id, status: ReturnStatus.APPROVED },
        data: { status: ReturnStatus.RECEIVED, receivedAt: new Date(), refundStatus: 'PENDING', restocked: !!dto.restock },
      });
      if (moved.count === 0) throw new ConflictException('Deze retour kan nu niet als ontvangen worden gemarkeerd');

      const items = await tx.returnItem.findMany({ where: { returnRequestId: id }, include: { orderItem: true } });
      if (dto.restock) {
        for (const l of items) {
          if (l.orderItem.productVariantId) {
            await tx.$executeRaw`UPDATE "product_variants" SET "stock" = "stock" + ${l.quantity}, "updated_at" = NOW() WHERE "id" = ${l.orderItem.productVariantId}::uuid`;
          } else {
            await tx.$executeRaw`UPDATE "products" SET "stock" = "stock" + ${l.quantity}, "updated_at" = NOW() WHERE "id" = ${l.orderItem.productId}::uuid`;
          }
        }
      }
      return items;
    });
    await this.audit(user.id, 'RETURN_RECEIVED', id, { restock: !!dto.restock, lines: lines.length });
    await this.runRefund(ret.id);
    return this.byId(id);
  }

  /** Retries a failed (or stuck) refund. Shop or admin. */
  async retryRefund(user: AuthUser, id: string) {
    await this.loadForShop(user, id);
    const claimed = await this.prisma.returnRequest.updateMany({
      where: {
        id,
        status: ReturnStatus.RECEIVED,
        OR: [{ refundStatus: 'FAILED' }, { refundStatus: 'PENDING', updatedAt: { lt: new Date(Date.now() - STUCK_REFUND_MS) } }],
      },
      data: { refundStatus: 'PENDING' },
    });
    if (claimed.count === 0) throw new ConflictException('Er is geen mislukte terugbetaling om opnieuw te proberen');
    await this.runRefund(id);
    return this.byId(id);
  }

  async listAll(status?: ReturnStatus, limit = 100) {
    const rows = await this.prisma.returnRequest.findMany({
      where: status ? { status } : {},
      orderBy: { requestedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: returnInclude,
    });
    return rows.map((r) => this.view(r));
  }

  // ---------------- refund ----------------

  /** Computes and executes the refund of a RECEIVED return. Never throws; the outcome is stored on the return. */
  private async runRefund(id: string): Promise<void> {
    try {
      const ret = await this.prisma.returnRequest.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { orderItem: true } }, order: { include: { items: true } } },
      });
      const others = await this.prisma.returnRequest.findMany({
        where: { orderId: ret.orderId, id: { not: id }, status: { in: [ReturnStatus.RECEIVED, ReturnStatus.REFUNDED] } },
        include: { items: true },
      });
      const already = new Map<string, number>();
      for (const o of others) for (const i of o.items) already.set(i.orderItemId, (already.get(i.orderItemId) ?? 0) + i.quantity);

      const amountCents = computeReturnRefundCents(
        ret.items.map((l) => ({ orderItemId: l.orderItemId, quantity: l.quantity, unitPriceCents: toCents(l.orderItem.unitPrice) })),
        ret.order.items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
        already,
        toCents(ret.order.deliveryFee),
      );

      const result = await this.payments.refundOrder(ret.orderId, `Retour ${ret.returnNumber}`, amountCents, `return-${ret.id}-${Date.now()}`);
      const ok = result.status === 'REFUNDED' || result.status === 'NOT_REQUIRED';
      await this.prisma.returnRequest.update({
        where: { id },
        data: ok
          ? { status: ReturnStatus.REFUNDED, refundStatus: result.status, refundAmountCents: result.refundedCents, refundedAt: new Date() }
          : { refundStatus: 'FAILED', refundAmountCents: amountCents },
      });
      if (ok) {
        await this.notifyConsumer(ret.consumerProfileId, 'Retour terugbetaald', `Voor retour ${ret.returnNumber} is ${eur(result.refundedCents)} terugbetaald.`, true);
      } else {
        await this.audit(null, 'RETURN_REFUND_FAILED', id, { amountCents });
      }
    } catch (err) {
      this.logger.error(`Return refund failed for ${id}: ${(err as Error).message}`);
      await this.prisma.returnRequest.updateMany({ where: { id, status: ReturnStatus.RECEIVED }, data: { refundStatus: 'FAILED' } }).catch(() => undefined);
    }
  }

  // ---------------- helpers ----------------

  private async heldQuantities(tx: Prisma.TransactionClient, orderId: string): Promise<Map<string, number>> {
    const rows = await tx.returnItem.findMany({
      where: { returnRequest: { orderId, status: { in: [...QUANTITY_HOLDING_STATUSES] as ReturnStatus[] } } },
      select: { orderItemId: true, quantity: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.quantity);
    return map;
  }

  private newReturnNumber(): string {
    return `RET-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  private async profileOf(user: AuthUser) {
    if (user.role !== UserRole.CONSUMER) throw new ForbiddenException('Alleen klanten kunnen retourneren');
    const profile = await this.prisma.consumerProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Geen consumentenprofiel gevonden voor deze gebruiker');
    return profile;
  }

  private async assertShopAccess(user: AuthUser, businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true, deletedAt: true } });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    if (!(await this.employees.canAccessShop(user, businessId))) throw new ForbiddenException('Je hebt geen toegang tot deze winkel');
  }

  private async loadForShop(user: AuthUser, id: string) {
    const ret = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException('Retour niet gevonden');
    await this.assertShopAccess(user, ret.businessId);
    return ret;
  }

  private async byId(id: string) {
    const row = await this.prisma.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude });
    return this.view(row);
  }

  private view(r: ReturnRow) {
    return {
      id: r.id,
      returnNumber: r.returnNumber,
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      businessId: r.businessId,
      businessName: r.business.name,
      customerName: r.consumerProfile.displayName,
      status: r.status,
      reason: r.reason,
      merchantNote: r.merchantNote,
      refundStatus: r.refundStatus,
      refundAmountCents: r.refundAmountCents,
      restocked: r.restocked,
      requestedAt: r.requestedAt,
      decidedAt: r.decidedAt,
      receivedAt: r.receivedAt,
      refundedAt: r.refundedAt,
      items: r.items.map((i) => ({
        orderItemId: i.orderItemId,
        quantity: i.quantity,
        name: i.orderItem.productNameSnapshot,
        variant: i.orderItem.variantSnapshot,
        unitPriceCents: toCents(i.orderItem.unitPrice),
      })),
    };
  }

  private audit(actorUserId: string | null, action: string, targetId: string, metadata: Prisma.InputJsonValue = {}) {
    return this.prisma.auditLog.create({ data: { actorUserId, action, targetType: 'RETURN', targetId, metadata } }).catch(() => undefined);
  }

  private async notifyConsumer(consumerProfileId: string, title: string, message: string, email = false) {
    try {
      const profile = await this.prisma.consumerProfile.findUnique({ where: { id: consumerProfileId }, select: { userId: true } });
      if (profile) await this.notifications.notifyUser(profile.userId, NotificationType.RETURN, title, message, { linkUrl: '/account/orders', email });
    } catch {
      /* best effort */
    }
  }

  private async notifyOwner(businessId: string, title: string, message: string) {
    try {
      const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { ownerProfile: { select: { userId: true } } } });
      const userId = business?.ownerProfile?.userId;
      if (userId) await this.notifications.notifyUser(userId, NotificationType.RETURN, title, message, { linkUrl: '/owner/returns', email: true });
    } catch {
      /* best effort */
    }
  }
}
