import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateShopRegistrationDto } from './dto/create-shop-registration.dto';
import { ShopRegistrationsService } from './shop-registrations.service';

@Controller('shop-registrations')
@ApiTags('shop-registrations')
export class ShopRegistrationsController {
  constructor(private shopRegistrationsService: ShopRegistrationsService) {}

  // Public endpoint — this is what the "Join as a shop" floating widget on
  // every page of the site posts to. No auth: the visitor filling it in is
  // (usually) not yet a registered user.
  @Post()
  @ApiOperation({ summary: 'Nieuwe shop-owner registratie (pilot aanmelding)' })
  @ApiResponse({ status: 201, description: 'Registratie opgeslagen' })
  async create(@Body() dto: CreateShopRegistrationDto) {
    return this.shopRegistrationsService.create(dto);
  }

  // Admin-only: review incoming leads in the admin panel.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lijst van shop-owner registraties (admin only)' })
  async findAll() {
    return this.shopRegistrationsService.findAll();
  }
}
