import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { AuthUser } from '../common/types/auth-user';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowGuest } from '../common/decorators/allow-guest.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==========================================
  // CONSUMER: CREATE PAYMENT INTENT
  // ==========================================

  @Post('payments/intent')
  @AllowGuest()
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @ApiOperation({
    summary: 'Create payment intent for an order, workshop booking or business subscription',
    description:
      'The amount is derived server-side; any client-sent amount is rejected. ' +
      'The payment starts in PENDING status and becomes PAID only via a verified provider webhook.',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the order owner or business owner).' })
  async createPaymentIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(user, dto);
  }

  // ==========================================
  // CONSUMER: GET PAYMENT STATUS
  // ==========================================

  @Get('payments/:paymentId')
  @AllowGuest()
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get payment status by ID' })
  @ApiParam({ name: 'paymentId', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Payment details.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized).' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.getPayment(paymentId, user);
  }

  // ==========================================
  // BUSINESS OWNER: GET BUSINESS PAYMENTS
  // ==========================================

  @Get('businesses/:businessId/payments')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all payments for a business' })
  @ApiParam({ name: 'businessId', description: 'Business UUID' })
  @ApiResponse({ status: 200, description: 'List of business payments.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the business owner).' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async getBusinessPayments(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.getBusinessPayments(businessId, user);
  }

  // ==========================================
  // ADMIN / BUSINESS: PROCESS REFUND
  // ==========================================

  @Post('payments/:paymentId/refund')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process refund for a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment UUID' })
  @ApiResponse({ status: 200, description: 'Refund confirmed by the payment provider.' })
  @ApiResponse({ status: 503, description: 'No payment provider configured / provider unavailable.' })
  @ApiResponse({ status: 400, description: 'Invalid refund amount or payment not paid.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the business owner or admin).' })
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() dto: RefundPaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.processRefund(paymentId, user, {
      amount: dto.amount,
      reason: dto.reason,
      idempotencyKey: idempotencyKey?.slice(0, 128),
    });
  }
}