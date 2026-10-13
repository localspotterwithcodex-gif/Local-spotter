import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShopRoutesService } from './shoproutes.service';
import { CreateShopRouteDto, UpdateShopRouteDto, QueryShopRouteDto, CreateRouteStopDto, UpdateRouteStopDto, ReorderStopsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Shop Routes')
@Controller('shop-routes')
export class ShopRoutesController {
  constructor(private readonly shopRoutesService: ShopRoutesService) {}

  // ==========================================
  // PUBLIC ROUTE ENDPOINTS
  // ==========================================

  @Get('shop-routes')
  @ApiOperation({ summary: 'Get public shop routes with optional filters' })
  @ApiResponse({ status: 200, description: 'List of public shop routes.' })
  async getPublicRoutes(@Query() query: QueryShopRouteDto) {
    return this.shopRoutesService.getPublicRoutes(query);
  }

  @Get('shop-routes/:routeId')
  @ApiOperation({ summary: 'Get shop route details by ID' })
  @ApiResponse({ status: 200, description: 'Shop route details.' })
  async getRouteById(
    @Param('routeId') routeId: string,
    @Req() req: any,
  ) {
    return this.shopRoutesService.getRouteById(routeId, req?.user);
  }

  @Get('maps/businesses')
  @ApiOperation({ summary: 'Get map markers for eligible businesses' })
  @ApiResponse({ status: 200, description: 'List of eligible businesses for map.' })
  async getMapBusinesses(@Query() query: QueryShopRouteDto) {
    return this.shopRoutesService.getMapBusinesses(query);
  }

  // ==========================================
  // BUSINESS OWNER / ADMIN ROUTE CRUD
  // ==========================================

  @Post('shop-routes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shop route (requires Shoproutes entitlement)' })
  @ApiResponse({ status: 201, description: 'Route created successfully.' })
  async createRoute(
    @CurrentUser() user: any,
    @Body() dto: CreateShopRouteDto,
  ) {
    return this.shopRoutesService.createRoute(user, dto);
  }

  @Get('businesses/:businessId/shop-routes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all routes for owned business' })
  @ApiResponse({ status: 200, description: 'List of business routes.' })
  async getBusinessRoutes(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
    @Query() query: QueryShopRouteDto,
  ) {
    return this.shopRoutesService.getBusinessRoutes(businessId, user, query);
  }

  @Patch('shop-routes/:routeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop route (Creator or Admin)' })
  @ApiResponse({ status: 200, description: 'Route updated successfully.' })
  async updateRoute(
    @Param('routeId') routeId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateShopRouteDto,
  ) {
    return this.shopRoutesService.updateRoute(routeId, user, dto);
  }

  @Delete('shop-routes/:routeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel/archive a shop route (Creator or Admin)' })
  @ApiResponse({ status: 200, description: 'Route archived.' })
  async cancelRoute(
    @Param('routeId') routeId: string,
    @CurrentUser() user: any,
  ) {
    return this.shopRoutesService.cancelRoute(routeId, user);
  }

  // ==========================================
  // ROUTE STOP ENDPOINTS
  // ==========================================

  @Post('shop-routes/:routeId/stops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a stop to a route' })
  @ApiResponse({ status: 201, description: 'Stop added successfully.' })
  async addStop(
    @Param('routeId') routeId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateRouteStopDto,
  ) {
    return this.shopRoutesService.addStop(routeId, user, dto);
  }

  @Patch('shop-routes/:routeId/stops/:stopId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a route stop (Creator or Admin)' })
  @ApiResponse({ status: 200, description: 'Stop updated.' })
  async updateStop(
    @Param('routeId') routeId: string,
    @Param('stopId') stopId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateRouteStopDto,
  ) {
    return this.shopRoutesService.updateStop(routeId, stopId, user, dto);
  }

  @Delete('shop-routes/:routeId/stops/:stopId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a route stop (Creator or Admin)' })
  @ApiResponse({ status: 200, description: 'Stop removed.' })
  async removeStop(
    @Param('routeId') routeId: string,
    @Param('stopId') stopId: string,
    @CurrentUser() user: any,
  ) {
    return this.shopRoutesService.removeStop(routeId, stopId, user);
  }

  @Post('shop-routes/:routeId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder route stops' })
  @ApiResponse({ status: 200, description: 'Stops reordered.' })
  async reorderStops(
    @Param('routeId') routeId: string,
    @CurrentUser() user: any,
    @Body() dto: ReorderStopsDto,
  ) {
    return this.shopRoutesService.reorderStops(routeId, user, dto);
  }

  @Get('shop-routes/:routeId/stops')
  @ApiOperation({ summary: 'Get ordered stops for a route' })
  @ApiResponse({ status: 200, description: 'List of route stops in sequence.' })
  async getStops(@Param('routeId') routeId: string) {
    return this.shopRoutesService.getStops(routeId);
  }
}
