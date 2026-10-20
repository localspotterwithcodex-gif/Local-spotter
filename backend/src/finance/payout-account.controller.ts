import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { UpsertPayoutAccountDto } from './dto/payout.dto';
import { PayoutAccountService } from './payout-account.service';

@ApiTags('Finance')
@Controller('businesses/:businessId/payout-account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUSINESS_OWNER)
@ApiBearerAuth()
export class PayoutAccountController {
  constructor(private readonly accounts: PayoutAccountService) {}

  @Get()
  @ApiOperation({ summary: 'Payout bank account of the store (IBAN masked)' })
  get(@Param('businessId', ParseUUIDPipe) businessId: string, @CurrentUser() user: AuthUser) {
    return this.accounts.get(businessId, user);
  }

  @Put()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Set the payout bank account (IBAN validated, encrypted at rest)' })
  put(@Param('businessId', ParseUUIDPipe) businessId: string, @CurrentUser() user: AuthUser, @Body() dto: UpsertPayoutAccountDto) {
    return this.accounts.upsert(businessId, user, dto);
  }
}
