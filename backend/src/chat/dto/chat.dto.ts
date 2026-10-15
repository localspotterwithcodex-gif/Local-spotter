import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

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
