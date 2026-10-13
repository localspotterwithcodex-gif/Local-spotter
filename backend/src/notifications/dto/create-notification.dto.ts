import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, Length } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Nieuwe bestelling', description: 'Titels van de notificatie' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Er is een nieuwe bestelling geplaatst', description: 'De notificatie bericht' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'ORDER', description: 'Type notificatie' })
  @IsString()
  type: 'ORDER' | 'BOOKING' | 'FOLLOWER' | 'REVIEW' | 'PAYOUT' | 'SUBSCRIPTION' | 'SYSTEM';

  @ApiProperty({ example: 'order-123', description: 'Optioneel link URL naar gerelateerde resource' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldige UUID indeling voor linkUrl' })
  linkUrl?: string;
}