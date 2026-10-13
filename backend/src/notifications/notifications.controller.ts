import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ApiTags('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lijst van notificaties' })
  @ApiResponse({
    description: 'Lijst van notificaties voor de gebruiker',
  })
  async getNotifications(
    @CurrentUser() user: any,
    @Body() query?: { includeRead?: boolean },
  ) {
    return this.notificationsService.getNotifications(
      user.id,
      query?.includeRead,
    );
  }

  @Post(':notificationId/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notificatie markeren als gelezen' })
  @ApiResponse({
    description: 'Notificatie gemarkeerd als gelezen',
  })
  async markNotificationRead(
    @Param() param: { notificationId: string },
    @Body() dto: MarkNotificationReadDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markNotificationRead(
      param.notificationId,
      user.id,
    );
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alle notificaties markeren als gelezen' })
  @ApiResponse({
    description: 'Alle notificaties gemarkeerd als gelezen',
  })
  async markAllNotificationsRead(
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.markAllNotificationsRead(
      user.id,
    );
  }
}