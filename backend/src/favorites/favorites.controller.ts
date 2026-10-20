import { Controller, Delete, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.CONSUMER)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'My favorite products and stores' })
  list(@CurrentUser() user: any) {
    return this.favorites.list(user.profileId);
  }

  @Get('ids')
  @ApiOperation({ summary: 'IDs of my favorites (for heart buttons)' })
  ids(@CurrentUser() user: any) {
    return this.favorites.listIds(user.profileId);
  }

  @Put('products/:productId')
  @RateLimit({ limit: 120, windowMs: 15 * 60 * 1000 })
  addProduct(@CurrentUser() user: any, @Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.favorites.addProduct(user.profileId, productId);
  }

  @Delete('products/:productId')
  removeProduct(@CurrentUser() user: any, @Param('productId', new ParseUUIDPipe()) productId: string) {
    return this.favorites.removeProduct(user.profileId, productId);
  }

  @Put('businesses/:businessId')
  @RateLimit({ limit: 120, windowMs: 15 * 60 * 1000 })
  addBusiness(@CurrentUser() user: any, @Param('businessId', new ParseUUIDPipe()) businessId: string) {
    return this.favorites.addBusiness(user.profileId, businessId);
  }

  @Delete('businesses/:businessId')
  removeBusiness(@CurrentUser() user: any, @Param('businessId', new ParseUUIDPipe()) businessId: string) {
    return this.favorites.removeBusiness(user.profileId, businessId);
  }
}
