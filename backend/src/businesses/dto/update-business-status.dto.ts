import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BusinessStatus } from '@prisma/client';

export class UpdateBusinessStatusDto {
  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.ACTIVE })
  @IsEnum(BusinessStatus, { message: 'Ongeldige winkelstatus' })
  status: BusinessStatus;
}
