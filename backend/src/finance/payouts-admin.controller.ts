import { Body, Controller, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { FailPayoutDto, MarkPayoutPaidDto } from './dto/payout.dto';
import { PayoutsService } from './payouts.service';

@ApiTags('Admin')
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class PayoutsAdminController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the weekly payout creation now (idempotent per ISO week)' })
  run() {
    return this.payouts.runWeekly();
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="payouts.csv"')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'CSV with decrypted IBANs of open payouts (audited)' })
  async export(@CurrentUser() admin: AuthUser) {
    return (await this.payouts.exportOpenPayouts(admin.id)).csv;
  }

  @Patch(':payoutId/paid')
  @ApiOperation({ summary: 'Mark a payout as transferred' })
  paid(@Param('payoutId', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser, @Body() dto: MarkPayoutPaidDto) {
    return this.payouts.markPaid(id, admin.id, dto.providerReference);
  }

  @Patch(':payoutId/reject')
  @ApiOperation({ summary: 'Reject / fail a payout; the amount returns to the store balance' })
  reject(@Param('payoutId', ParseUUIDPipe) id: string, @CurrentUser() admin: AuthUser, @Body() dto: FailPayoutDto) {
    return this.payouts.fail(id, admin.id, dto.status, dto.reason);
  }
}
