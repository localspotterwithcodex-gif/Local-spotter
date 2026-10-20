import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnStatus, UserRole } from '@prisma/client';
import { AllowGuest } from '../common/decorators/allow-guest.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { CreateReturnDto, DecideReturnDto, ReceiveReturnDto } from './dto/returns.dto';
import { ReturnsService } from './returns.service';

function parseStatus(value?: string): ReturnStatus | undefined {
  return value && (Object.values(ReturnStatus) as string[]).includes(value) ? (value as ReturnStatus) : undefined;
}

@ApiTags('Returns')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  // consumer (guests included)

  @Post('returns')
  @AllowGuest()
  @Roles(UserRole.CONSUMER)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Request a return for delivered items' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReturnDto) {
    return this.returns.create(user, dto);
  }

  @Get('returns')
  @AllowGuest()
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'My return requests (optionally of one order)' })
  mine(@CurrentUser() user: AuthUser, @Query('orderId') orderId?: string) {
    return this.returns.listMine(user, orderId);
  }

  @Get('returns/:returnId')
  @AllowGuest()
  @Roles(UserRole.CONSUMER)
  one(@CurrentUser() user: AuthUser, @Param('returnId', ParseUUIDPipe) id: string) {
    return this.returns.getMine(user, id);
  }

  @Post('returns/:returnId/cancel')
  @AllowGuest()
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Withdraw a return that has not been decided yet' })
  cancel(@CurrentUser() user: AuthUser, @Param('returnId', ParseUUIDPipe) id: string) {
    return this.returns.cancel(user, id);
  }

  // shop: owner, active employee (CONSUMER role + membership, checked in the service) or admin

  @Get('businesses/:businessId/returns')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  forShop(@CurrentUser() user: AuthUser, @Param('businessId', ParseUUIDPipe) businessId: string, @Query('status') status?: string) {
    return this.returns.listForBusiness(user, businessId, parseStatus(status));
  }

  @Patch('returns/:returnId/decision')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a return request' })
  decide(@CurrentUser() user: AuthUser, @Param('returnId', ParseUUIDPipe) id: string, @Body() dto: DecideReturnDto) {
    return this.returns.decide(user, id, dto);
  }

  @Post('returns/:returnId/received')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Goods received: optional restock, then automatic refund' })
  received(@CurrentUser() user: AuthUser, @Param('returnId', ParseUUIDPipe) id: string, @Body() dto: ReceiveReturnDto) {
    return this.returns.markReceived(user, id, dto);
  }

  @Post('returns/:returnId/retry-refund')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Retry a failed refund' })
  retry(@CurrentUser() user: AuthUser, @Param('returnId', ParseUUIDPipe) id: string) {
    return this.returns.retryRefund(user, id);
  }

  // admin overview

  @Get('admin/returns')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'All returns (read-only overview)' })
  all(@Query('status') status?: string) {
    return this.returns.listAll(parseStatus(status));
  }
}
