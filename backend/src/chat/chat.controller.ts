import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { MAX_CHAT_ATTACHMENT_BYTES } from '../media/image-validation';
import { ChatService } from './chat.service';
import { BlockConversationDto, ReportChatDto, SendMessageDto, StartConversationDto } from './dto/chat.dto';

@ApiTags('Chat')
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Consumer starts (or re-opens) a conversation with a shop' })
  start(@Body() dto: StartConversationDto, @CurrentUser() user: AuthUser) {
    return this.chat.start(user, dto.businessId);
  }

  @Get()
  @ApiOperation({ summary: 'My conversations with last message and unread count (businessId: the shop inbox for owner/employees)' })
  list(@CurrentUser() user: AuthUser, @Query('businessId', new ParseUUIDPipe({ optional: true })) businessId?: string) {
    return this.chat.list(user, businessId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Total unread chat messages' })
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadCount(user);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Latest messages of a conversation (participants only)' })
  messages(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.chat.messages(user, id);
  }

  @Post(':id/messages')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 60, windowMs: 60 * 1000 })
  @ApiOperation({ summary: 'Send a message (max 2000 characters)' })
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    return this.chat.send(user, id, dto.body);
  }

  @Post(':id/attachments')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CHAT_ATTACHMENT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send an image (max 10 MB) with an optional caption in field `body`' })
  sendImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: { buffer: Buffer; size: number } | undefined,
    @Body('body') body: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chat.sendImage(user, id, file, typeof body === 'string' ? body : undefined);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the other party’s messages as read' })
  read(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.chat.markRead(user, id);
  }

  @Put(':id/block')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Block (or unblock) this conversation; nobody can send while it is blocked' })
  block(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BlockConversationDto, @CurrentUser() user: AuthUser) {
    return this.chat.setBlocked(user, id, dto.blocked);
  }

  @Post(':id/reports')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Report a message or the other party to the moderators' })
  report(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReportChatDto, @CurrentUser() user: AuthUser) {
    return this.chat.report(user, id, dto);
  }
}
