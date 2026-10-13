import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FollowBusinessDto {
  @ApiProperty({ example: 'uuid-business-id', description: 'Business UUID to follow' })
  @IsUUID('4', { message: 'Ongeldig business ID' })
  businessId: string;
}