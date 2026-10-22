import { Inject, Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SelectSubscriptionPlanDto } from './dto/select-subscription-plan.dto';
import { UserRole, SubscriptionStatus, PaymentProvider } from '@prisma/client';
import { PAYMENT_GATEWAY, PaymentGateway } from '../payments/payment-gateway';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private gateway: PaymentGateway,
  ) {}

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

    const existingSub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const now = new Date();
    // Selecting the plan you already have and pay for changes nothing.
    if (existingSub && existingSub.planId === plan.id && existingSub.status === SubscriptionStatus.ACTIVE && existingSub.currentPeriodEnd > now) {
      return this.prisma.businessSubscription.findUnique({ where: { businessId }, include: { plan: true } });
    }

    // A plan only becomes ACTIVE through a verified payment (PaymentsService sets the
    // paid period). The one exception is local development without a payment provider
    // configured, so the app can still be worked on end to end; production never skips payment.
    const devActivation = process.env.NODE_ENV !== 'production' && !this.gateway.isConfigured();
    // A plan that costs nothing has nothing to pay: it is active right away, in every environment.
    const freePlan = Number(plan.monthlyPrice) <= 0;
    const activateNow = devActivation || freePlan;
    if (devActivation && !freePlan) {
      this.logger.warn('No payment provider configured: activating the subscription without payment (development only)');
    }
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const initialStatus = activateNow ? SubscriptionStatus.ACTIVE : SubscriptionStatus.INCOMPLETE;

    if (existingSub) {
      return this.prisma.businessSubscription.update({
        where: { businessId },
        data: {
          planId: plan.id,
          status: initialStatus,
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
        status: initialStatus,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: activateNow ? PaymentProvider.MANUAL : PaymentProvider.MOLLIE,
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
