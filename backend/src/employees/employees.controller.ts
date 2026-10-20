import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { AcceptInviteDto, InviteEmployeeDto } from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get('businesses/:businessId/employees')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Employees and open invites of a shop (owner)' })
  list(@Param('businessId', ParseUUIDPipe) businessId: string, @CurrentUser() user: AuthUser) {
    return this.employees.list(user, businessId);
  }

  @Post('businesses/:businessId/employees')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Invite an employee by e-mail (owner)' })
  invite(@Param('businessId', ParseUUIDPipe) businessId: string, @Body() dto: InviteEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.employees.invite(user, businessId, dto.email, dto.role);
  }

  @Delete('businesses/:businessId/employees/:employeeId')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke an employee or invite (owner)' })
  revoke(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employees.revoke(user, businessId, employeeId);
  }

  @Post('staff/accept')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({ summary: 'Accept an invite sent to your e-mail address' })
  accept(@Body() dto: AcceptInviteDto, @CurrentUser() user: AuthUser) {
    return this.employees.accept(user, dto.token);
  }

  @Get('staff/shops')
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Shops I work for' })
  shops(@CurrentUser() user: AuthUser) {
    return this.employees.myShops(user);
  }
}
