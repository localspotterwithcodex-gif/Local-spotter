import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatReportReason, ChatReportStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

export class StartConversationDto {
  @ApiProperty({ description: 'Business (shop) to talk to' })
  @IsUUID()
  businessId: string;
}

export class SendMessageDto {
  @ApiProperty({ maxLength: MAX_CHAT_MESSAGE_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CHAT_MESSAGE_LENGTH)
  body: string;
}

export class BlockConversationDto {
  @ApiProperty({ description: 'true blocks the conversation, false lifts your own block' })
  @IsBoolean()
  blocked: boolean;
}

export class ReportChatDto {
  @ApiPropertyOptional({ description: 'Message being reported (omit to report the other party in general)' })
  @IsOptional()
  @IsUUID()
  messageId?: string;

  @ApiProperty({ enum: ChatReportReason })
  @IsEnum(ChatReportReason)
  reason: ChatReportReason;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class ResolveChatReportDto {
  @ApiProperty({ enum: [ChatReportStatus.RESOLVED, ChatReportStatus.DISMISSED] })
  @IsIn([ChatReportStatus.RESOLVED, ChatReportStatus.DISMISSED])
  status: 'RESOLVED' | 'DISMISSED';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ChatReportQueryDto {
  @ApiPropertyOptional({ enum: ChatReportStatus })
  @IsOptional()
  @IsEnum(ChatReportStatus)
  status?: ChatReportStatus;
}
