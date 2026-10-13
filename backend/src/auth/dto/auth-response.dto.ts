import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UserPayloadDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  username?: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ required: false })
  displayName?: string;

  @ApiProperty({ required: false })
  profileId?: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserPayloadDto })
  user: UserPayloadDto;
}
