import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { AdminPlansService, MAX_COMMISSION_BPS, MAX_PLAN_PRICE } from './admin-plans.service';

export class SetCommissionDto {
  @ApiProperty({ nullable: true, description: 'Basis points (500 = 5%); null = platform default' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_COMMISSION_BPS)
  commissionBps!: number | null;
}

export class UpdatePlanDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(1) @MaxLength(60) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiProperty({ required: false, description: 'Monthly price in euro' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PLAN_PRICE)
  monthlyPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() active?: boolean;
}

@ApiTags('Admin')
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminPlansController {
  constructor(private readonly plans: AdminPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Subscription plans with their commission' })
  list() {
    return this.plans.list();
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Edit a plan: name, description, monthly price, active. Price changes apply to future payments only.' })
  update(@Param('planId', ParseUUIDPipe) planId: string, @CurrentUser() admin: AuthUser, @Body() dto: UpdatePlanDto) {
    return this.plans.update(planId, dto, admin.id);
  }

  @Patch(':planId/commission')
  @ApiOperation({ summary: 'Set the platform commission of a plan (affects future payments only)' })
  set(@Param('planId', ParseUUIDPipe) planId: string, @CurrentUser() admin: AuthUser, @Body() dto: SetCommissionDto) {
    if (dto.commissionBps === undefined) throw new BadRequestException('commissionBps is required (use null for the platform default)');
    return this.plans.setCommission(planId, dto.commissionBps, admin.id);
  }
}
