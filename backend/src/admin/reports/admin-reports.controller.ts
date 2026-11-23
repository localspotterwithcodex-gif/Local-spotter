import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessStatus, SubscriptionPlanSlug, UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user';
import { AdminReportsService } from './admin-reports.service';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

class FormatQuery {
  @IsOptional() @IsIn(['json', 'csv']) format?: 'json' | 'csv';
}
class MonthQuery extends FormatQuery {
  @Matches(MONTH, { message: 'month must be YYYY-MM' }) month!: string;
}
class BusinessesQuery extends MonthQuery {
  @IsOptional() @IsEnum(SubscriptionPlanSlug) plan?: SubscriptionPlanSlug;
  @IsOptional() @IsEnum(BusinessStatus) status?: BusinessStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}
class SeriesQuery extends FormatQuery {
  @Matches(MONTH, { message: 'from must be YYYY-MM' }) from!: string;
  @Matches(MONTH, { message: 'to must be YYYY-MM' }) to!: string;
}

@ApiTags('Admin')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  private async send(res: Response, kind: 'monthly' | 'businesses' | 'business', data: Record<string, any>, format: string | undefined, admin: AuthUser, file: string) {
    if (format !== 'csv') return data;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}.csv"`, 'Cache-Control': 'no-store' });
    return this.reports.toCsv(kind, data, admin.id);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Platform totals for a month: orders, sales, refunds, commission, subscriptions, payouts (cents, EUR)' })
  async monthly(@Query() q: MonthQuery, @CurrentUser() admin: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.send(res, 'monthly', await this.reports.monthly(q.month), q.format, admin, `localspotter-${q.month}`);
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Per shop for a month: plan, orders, sales, refunds, commission, net owed, payout status (50 per page)' })
  async businesses(@Query() q: BusinessesQuery, @CurrentUser() admin: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.send(res, 'businesses', await this.reports.businesses(q), q.format, admin, `localspotter-shops-${q.month}`);
  }

  @Get('businesses/:businessId')
  @ApiOperation({ summary: 'One shop month by month, with the ledger entries behind the numbers' })
  async business(@Param('businessId', ParseUUIDPipe) id: string, @Query() q: SeriesQuery, @CurrentUser() admin: AuthUser, @Res({ passthrough: true }) res: Response) {
    return this.send(res, 'business', await this.reports.business(id, q.from, q.to), q.format, admin, `localspotter-shop-${q.from}-${q.to}`);
  }
}
