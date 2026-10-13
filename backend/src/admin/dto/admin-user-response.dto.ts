import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class AdminUserResponseDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'CONSUMER', enum: UserRole })
  role: UserRole;

  @ApiProperty({ example: 'ACTIVE', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ example: 'John Doe', nullable: true })
  displayName: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: 0, nullable: true })
  orderCount: number;

  @ApiProperty({ example: 1, nullable: true })
  businessCount: number;
}
