import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateConsumerProfileDto } from './dto/update-consumer-profile.dto';
import { UpdateBusinessOwnerProfileDto } from './dto/update-business-owner-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users & Profiles')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/consumer')
  @Roles(UserRole.CONSUMER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current consumer profile (CONSUMER role required)' })
  @ApiResponse({ status: 200, description: 'Consumer profile retrieved.' })
  async getConsumerProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getConsumerProfile(userId);
  }

  @Patch('profile/consumer')
  @Roles(UserRole.CONSUMER)
  @ApiOperation({ summary: 'Update current consumer profile (CONSUMER role required)' })
  @ApiResponse({ status: 200, description: 'Consumer profile updated.' })
  async updateConsumerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateConsumerProfileDto,
  ) {
    return this.usersService.updateConsumerProfile(userId, dto);
  }

  @Get('profile/business-owner')
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current business owner profile (BUSINESS_OWNER role required)' })
  @ApiResponse({ status: 200, description: 'Business owner profile retrieved.' })
  async getBusinessOwnerProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getBusinessOwnerProfile(userId);
  }

  @Patch('profile/business-owner')
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Update current business owner profile (BUSINESS_OWNER role required)' })
  @ApiResponse({ status: 200, description: 'Business owner profile updated.' })
  async updateBusinessOwnerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessOwnerProfileDto,
  ) {
    return this.usersService.updateBusinessOwnerProfile(userId, dto);
  }
}
