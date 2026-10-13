import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get list of active business categories' })
  @ApiResponse({ status: 200, description: 'Active business categories.' })
  async getCategories() {
    return this.businessesService.getCategories();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new business (BUSINESS_OWNER role required)' })
  @ApiResponse({ status: 201, description: 'Business created successfully.' })
  async create(@CurrentUser() user: any, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(user, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get businesses owned by authenticated user' })
  @ApiResponse({ status: 200, description: 'List of owned businesses.' })
  async getMyBusinesses(@CurrentUser() user: any) {
    return this.businessesService.getMyBusinesses(user);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get public business profile by ID or slug' })
  @ApiResponse({ status: 200, description: 'Public business details.' })
  async getPublicBusiness(@Param('idOrSlug') idOrSlug: string) {
    return this.businessesService.getPublicBusinessByIdOrSlug(idOrSlug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business information (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Business updated successfully.' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(id, user, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business status (DRAFT/PENDING for owner, ACTIVE/SUSPENDED for admin)' })
  @ApiResponse({ status: 200, description: 'Business status updated.' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateBusinessStatusDto,
  ) {
    return this.businessesService.updateStatus(id, user, dto);
  }

  @Get(':id/hours')
  @ApiOperation({ summary: 'Get weekly opening hours for business' })
  @ApiResponse({ status: 200, description: 'Weekly opening hours.' })
  async getHours(@Param('id') id: string) {
    return this.businessesService.getHours(id);
  }

  @Patch(':id/hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update weekly opening hours (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Weekly hours updated.' })
  async updateHours(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateBusinessHoursDto,
  ) {
    return this.businessesService.updateHours(id, user, dto);
  }
}
