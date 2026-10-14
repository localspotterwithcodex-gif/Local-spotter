import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@Controller('businesses/:businessId/balance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  @ApiOperation({ summary: 'Balance, recent ledger entries and payouts of an owned business (read-only)' })
  getBalance(@Param('businessId', ParseUUIDPipe) businessId: string, @CurrentUser() user: AuthUser) {
    return this.finance.getBalance(businessId, user);
  }
}
