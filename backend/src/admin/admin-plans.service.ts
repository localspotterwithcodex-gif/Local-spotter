import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export const MAX_COMMISSION_BPS = 5000;
export const MAX_PLAN_PRICE = 10000;

export type PlanEdit = {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  active?: boolean;
};

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
      plans: plans.map((p) => ({ id: p.id, name: p.name, slug: p.slug, monthlyPrice: Number(p.monthlyPrice.toString()), commissionBps: p.commissionBps, active: p.active, description: p.description ?? '' })),
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

  /**
   * Edit a plan's public details. The price applies to payments and renewals created after the change;
   * payments already made keep the amount they were charged. The slug is the plan's identity and never changes.
   */
  async update(planId: string, edit: PlanEdit, adminId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const data: PlanEdit = {};
    if (edit.name !== undefined) {
      const name = edit.name.trim();
      if (!name) throw new BadRequestException('Plan name is required');
      data.name = name;
    }
    if (edit.description !== undefined) data.description = edit.description.trim();
    if (edit.monthlyPrice !== undefined) {
      const cents = Math.round(edit.monthlyPrice * 100);
      if (!Number.isFinite(edit.monthlyPrice) || cents < 0 || edit.monthlyPrice > MAX_PLAN_PRICE) {
        throw new BadRequestException(`Price must be between 0 and ${MAX_PLAN_PRICE}`);
      }
      data.monthlyPrice = cents / 100;
    }
    if (edit.active !== undefined) data.active = edit.active;
    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to update');

    const before = { name: plan.name, description: plan.description, monthlyPrice: Number(plan.monthlyPrice.toString()), active: plan.active };
    const [updated] = await this.prisma.$transaction([
      this.prisma.subscriptionPlan.update({ where: { id: planId }, data }),
      this.prisma.auditLog.create({
        data: { actorUserId: adminId, action: 'ADMIN_UPDATE_PLAN', targetType: 'SUBSCRIPTION_PLAN', targetId: planId, metadata: { from: before, to: { ...data } } },
      }),
    ]);
    return { id: updated.id, slug: updated.slug, name: updated.name, description: updated.description ?? '', monthlyPrice: Number(updated.monthlyPrice.toString()), active: updated.active };
  }
}
