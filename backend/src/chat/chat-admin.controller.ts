import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { ChatService } from './chat.service';
import { ChatReportQueryDto, ResolveChatReportDto } from './dto/chat.dto';

@ApiTags('Admin')
@Controller('admin/chat-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ChatAdminController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Chat reports (default: open)' })
  list(@Query() query: ChatReportQueryDto) {
    return this.chat.listReports(query.status);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve or dismiss a chat report (audit-logged)' })
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveChatReportDto, @CurrentUser() user: AuthUser) {
    return this.chat.resolveReport(user.id, id, dto.status, dto.note);
  }
}

/** Called by an external scheduler (Render Cron Job) with the x-cron-secret header. */
@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class ChatJobsController {
  constructor(private readonly chat: ChatService) {}

  @Post('chat-retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete chat history older than 12 months (messages with open reports are kept)' })
  retention() {
    return this.chat.purgeExpired();
  }
}
