import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_COMMISSION_BPS = 5000;

/** Per-plan platform commission (basis points). null = platform default (COMMISSION_DEFAULT_BPS). */
@Injectable()
export class AdminPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const plans = await this.prisma.subscriptionPlan.findMany({ orderBy: { monthlyPrice: 'asc' } });
    const raw = Number(this.config.get<string>('COMMISSION_DEFAULT_BPS'));
    return {
      defaultBps: Number.isInteger(raw) && raw > 0 ? raw : 0,
      plans: plans.map((p) => ({ id: p.id, name: p.name, slug: p.slug, monthlyPrice: Number(p.monthlyPrice.toString()), commissionBps: p.commissionBps, active: p.active })),
    };
  }

  /** Applies to payments received after the change; earlier sales keep the rate they were booked with. */
  async setCommission(planId: string, commissionBps: number | null, adminId: string) {
    if (commissionBps !== null && (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > MAX_COMMISSION_BPS)) {
      throw new BadRequestException(`Commission must be a whole number of basis points between 0 and ${MAX_COMMISSION_BPS}`);
    }
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    const [updated] = await this.prisma.$transaction([
      this.prisma.subscriptionPlan.update({ where: { id: planId }, data: { commissionBps } }),
      this.prisma.auditLog.create({
        data: { actorUserId: adminId, action: 'ADMIN_SET_PLAN_COMMISSION', targetType: 'SUBSCRIPTION_PLAN', targetId: planId, metadata: { from: plan.commissionBps, to: commissionBps } },
      }),
    ]);
    return { id: updated.id, commissionBps: updated.commissionBps };
  }
}
