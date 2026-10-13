import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlanSlug } from '@prisma/client';

export class SelectSubscriptionPlanDto {
  @ApiProperty({ enum: SubscriptionPlanSlug, example: SubscriptionPlanSlug.WORKSHOP })
  @IsEnum(SubscriptionPlanSlug, { message: 'Ongeldig abonnement type' })
  planSlug: SubscriptionPlanSlug;
}
