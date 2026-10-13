import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiProperty({ example: true, description: 'Of de notificatie als gelezen moet worden' })
  @IsBoolean()
  markAsRead: boolean;
}