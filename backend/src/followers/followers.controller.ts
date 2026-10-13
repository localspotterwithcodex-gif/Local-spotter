import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FollowBusinessDto } from './dto/follow-business.dto';
import { FollowStatusDto } from './dto/follow-status.dto';
import { FollowersService } from './followers.service';

@Controller('businesses')
@ApiTags('followers')
export class FollowersController {
  constructor(private followersService: FollowersService) {}

  @Post(':businessId/follow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Volg een business' })
  @ApiResponse({
    status: 200,
    type: FollowStatusDto,
    description: 'Business succesvol gevolgd',
  })
  async followBusiness(
    @Param() param: { businessId: string },
    @Body() dto: FollowBusinessDto,
    @CurrentUser() user: any,
  ): Promise<FollowStatusDto> {
    return this.followersService.followBusiness(
      param.businessId,
      user.consumerProfileId,
    );
  }

  @Delete(':businessId/follow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Volging annuleren (unfollow)' })
  @ApiResponse({
    status: 200,
    type: FollowStatusDto,
    description: 'Volging succesvol geannuleerd',
  })
  async unfollowBusiness(
    @Param() param: { businessId: string },
    @Body() dto: FollowBusinessDto,
    @CurrentUser() user: any,
  ): Promise<FollowStatusDto> {
    return this.followersService.unfollowBusiness(
      param.businessId,
      user.consumerProfileId,
    );
  }

  @Get(':businessId/follow-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check follow status' })
  @ApiResponse({
    status: 200,
    type: FollowStatusDto,
    description: 'Of de gebruiker de business volgt',
  })
  async checkFollowStatus(
    @Param() param: { businessId: string },
    @CurrentUser() user: any,
  ): Promise<FollowStatusDto> {
    return this.followersService.checkFollowStatus(
      param.businessId,
      user.consumerProfileId,
    );
  }

  @Get('me/following')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lijst van gevolgde bedrijven' })
  @ApiResponse({
    description: 'Lijst van bedrijven die de gebruiker volgt',
  })
  async getFollowedBusinesses(
    @CurrentUser() user: any,
  ): Promise<{ id: string; name: string; followed: boolean }[]> {
    return this.followersService.getFollowedBusinesses(
      user.consumerProfileId,
    );
  }
}