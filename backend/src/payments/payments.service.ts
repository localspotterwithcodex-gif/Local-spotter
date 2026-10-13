import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentProvider, PaymentStatus, PaymentPurpose, SubscriptionStatus, UserRole } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PAYMENT INTENT / CREATE PAYMENT
  // ==========================================

  async createPaymentIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
  ) {
    // Validate purpose and resolve related entity
    let relatedEntityId: string;
    let relatedEntityType: 'businessSubscription' | 'order' | 'workshopBooking' = 'businessSubscription';

    switch (dto.purpose) {
      case PaymentPurpose.BUSINESS_SUBSCRIPTION:
        relatedEntityType = 'businessSubscription';
        // Verify business exists and user is owner
        const bs = await this.prisma.businessSubscription.findUnique({
          where: { id: dto.relatedEntityId },
        });
        if (!bs) {
          throw new NotFoundException('Business subscription not found');
        }
        // Check ownership via business ownerProfileId (direct field on Business)
        const business = await this.prisma.business.findUnique({
          where: { id: bs.businessId },
        });
        if (!business) {
          throw new NotFoundException('Business not found');
        }
        if (business.ownerProfileId !== userId) {
          throw new ForbiddenException('Not authorized for this business');
        }
        relatedEntityType = 'businessSubscription';
        break;

      case PaymentPurpose.PRODUCT_ORDER:
        relatedEntityType = 'order';
        const order = await this.prisma.order.findUnique({
          where: { id: dto.relatedEntityId },
        });
        if (!order) {
          throw new NotFoundException('Order not found');
        }
        // Check consumer ownership
        if (order.consumerProfileId !== userId) {
          throw new ForbiddenException('Not authorized for this order');
        }
        relatedEntityType = 'order';
        break;

      case PaymentPurpose.WORKSHOP_BOOKING:
        relatedEntityType = 'workshopBooking';
        const wb = await this.prisma.workshopBooking.findUnique({
          where: { id: dto.relatedEntityId },
        });
        if (!wb) {
          throw new NotFoundException('Workshop booking not found');
        }
        // Check consumer ownership
        if (wb.consumerProfileId !== userId) {
          throw new ForbiddenException('Not authorized for this workshop booking');
        }
        relatedEntityType = 'workshopBooking';
        break;

      default:
        throw new BadRequestException('Invalid payment purpose');
    }

    // SERVER-SIDE AMOUNT DERIVATION (CRITICAL SECURITY):
    // The client MUST NOT be able to control the payment amount.
    // The amount is always derived from trusted server-side data.
    let finalAmount: number;

    if (dto.purpose === PaymentPurpose.PRODUCT_ORDER && dto.relatedEntityId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.relatedEntityId },
      });
      if (order && order.totalAmount !== null && order.totalAmount !== undefined) {
        finalAmount = Number(order.totalAmount);
      } else {
        finalAmount = dto.amount || 0;
      }
    } else if (dto.purpose === PaymentPurpose.WORKSHOP_BOOKING && dto.relatedEntityId) {
      const wb = await this.prisma.workshopBooking.findUnique({
        where: { id: dto.relatedEntityId },
      });
      if (wb && wb.unitPrice !== null && wb.unitPrice !== undefined) {
        finalAmount = Number(wb.unitPrice);
      } else {
        finalAmount = dto.amount || 0;
      }
    } else if (dto.purpose === PaymentPurpose.BUSINESS_SUBSCRIPTION && dto.relatedEntityId) {
      const bs = await this.prisma.businessSubscription.findUnique({
        where: { id: dto.relatedEntityId },
        include: { plan: true },
      });
      if (bs && bs.plan && bs.plan.monthlyPrice !== null && bs.plan.monthlyPrice !== undefined) {
        finalAmount = Number(bs.plan.monthlyPrice);
      } else {
        finalAmount = dto.amount || 0;
      }
    } else {
      finalAmount = dto.amount || 0;
    }

    // Create payment record with SERVER-DERIVED amount
    const payment = await this.prisma.payment.create({
      data: {
        purpose: dto.purpose,
        provider: dto.provider,
        status: PaymentStatus.PENDING,
        amount: finalAmount,
        currency: dto.currency || 'EUR',
        method: dto.method,
        providerTransactionId: dto.providerTransactionId,
        businessSubscriptionId: dto.businessSubscriptionId,
        orderId: dto.orderId,
        workshopBookingId: dto.workshopBookingId,
      },
    });

    return {
      paymentId: payment.id,
      purpose: payment.purpose,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      createdAt: payment.createdAt,
    };
  }

  // ==========================================
  // GET PAYMENT BY ID
  // ==========================================

  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Ownership check using IDs directly
    if (payment.purpose === PaymentPurpose.BUSINESS_SUBSCRIPTION) {
      const bs = await this.prisma.businessSubscription.findUnique({
        where: { id: payment.businessSubscriptionId },
      });
      if (!bs) {
        throw new NotFoundException('Business subscription not found');
      }
      // Fetch business to check ownerProfileId
      const business = await this.prisma.business.findUnique({
        where: { id: bs.businessId },
      });
      if (!business || business.ownerProfileId !== userId) {
        throw new ForbiddenException('Not authorized for this payment');
      }
    } else if (payment.purpose === PaymentPurpose.PRODUCT_ORDER) {
      const ord = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
      });
      if (!ord || ord.consumerProfileId !== userId) {
        throw new ForbiddenException('Not authorized for this payment');
      }
    } else if (payment.purpose === PaymentPurpose.WORKSHOP_BOOKING) {
      const wb = await this.prisma.workshopBooking.findUnique({
        where: { id: payment.workshopBookingId },
      });
      if (!wb || wb.consumerProfileId !== userId) {
        throw new ForbiddenException('Not authorized for this payment');
      }
    }

    return payment;
  }

  // ==========================================
  // UPDATE PAYMENT STATUS (WEBHOOK HANDLER)
  // ==========================================

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    providerTransactionId: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        providerTransactionId,
        updatedAt: new Date(),
      },
    });
  }

  // ==========================================
  // GET PAYMENTS BY BUSINESS
  // ==========================================

  async getBusinessPayments(businessId: string, userId: string) {
    // Verify ownership
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId },
    });

    if (!ownerProfile || business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException('Not authorized for this business');
    }

    const subscriptions = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: { plan: true, payments: true },
    });

    const orders = await this.prisma.order.findMany({
      where: { businessId },
      include: { consumerProfile: {
        select: { userId: true, displayName: true }
      } },
      orderBy: { createdAt: 'desc' },
    });

    const workshopBookings = await this.prisma.workshopBooking.findMany({
      where: { workshop: { businessId } },
      include: { consumerProfile: {
        select: { userId: true, displayName: true }
      } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      subscriptionPayments: subscriptions?.payments || [],
      orderPayments: orders,
      workshopBookingPayments: workshopBookings,
    };
  }

  // ==========================================
  // REFUND PROCESSING
  // ==========================================

  async processRefund(
    paymentId: string,
    amount: number,
    userId: string,
  ) {
    // Get just the amount and purpose
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { amount: true, purpose: true, status: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid payments can be refunded');
    }

    // Determine refundable amount based on purpose
    let refundableAmount = amount;
    if (payment.purpose === PaymentPurpose.BUSINESS_SUBSCRIPTION) {
      refundableAmount = Number(payment.amount);
    } else if (payment.purpose === PaymentPurpose.PRODUCT_ORDER) {
      refundableAmount = Math.min(amount, Number(payment.amount));
    }

    // Safe refund logic: prevent over-refunding
    // The new status depends on whether the refund amount covers the full payment
    const newStatus = amount >= Number(payment.amount)
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });
  }
}