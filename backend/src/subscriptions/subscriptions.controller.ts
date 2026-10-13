import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SelectSubscriptionPlanDto } from './dto/select-subscription-plan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscriptions/plans')
  @ApiOperation({ summary: 'Get list of active subscription plans (Webshop €50, Shoproutes €100, Workshop €150)' })
  @ApiResponse({ status: 200, description: 'List of subscription plans.' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post('businesses/:businessId/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Select or upgrade subscription plan for owned business' })
  @ApiResponse({ status: 200, description: 'Subscription created or updated.' })
  async selectPlan(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Body() dto: SelectSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.selectPlan(businessId, user, dto);
  }

  @Get('businesses/:businessId/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription details for business' })
  @ApiResponse({ status: 200, description: 'Current subscription status.' })
  async getSubscription(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.getSubscription(businessId, user);
  }

  @Delete('businesses/:businessId/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel active subscription for business' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled.' })
  async cancelSubscription(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.cancelSubscription(businessId, user);
  }
}
