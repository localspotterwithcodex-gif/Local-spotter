import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SelectSubscriptionPlanDto } from './dto/select-subscription-plan.dto';
import { UserRole, SubscriptionStatus, PaymentProvider } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async selectPlan(businessId: string, user: any, dto: SelectSubscriptionPlanDto) {
    await this.verifyBusinessOwnership(businessId, user);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan || !plan.active) {
      throw new NotFoundException('Geselecteerd abonnement is niet beschikbaar');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const existingSub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (existingSub) {
      return this.prisma.businessSubscription.update({
        where: { businessId },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    }

    return this.prisma.businessSubscription.create({
      data: {
        businessId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: PaymentProvider.MANUAL,
      },
      include: { plan: true },
    });
  }

  async getSubscription(businessId: string, user: any) {
    await this.verifyBusinessOwnership(businessId, user);

    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('Geen abonnement gevonden voor deze winkel');
    }

    return sub;
  }

  async cancelSubscription(businessId: string, user: any) {
    await this.verifyBusinessOwnership(businessId, user);

    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!sub) {
      throw new NotFoundException('Geen abonnement gevonden voor deze winkel');
    }

    return this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        status: SubscriptionStatus.CANCELLED,
      },
      include: { plan: true },
    });
  }

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
      throw new ForbiddenException('Je bent niet gemachtigd voor deze winkel');
    }

    return business;
  }
}
