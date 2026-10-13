import { ApiProperty } from '@nestjs/swagger';

export class FollowStatusDto {
  @ApiProperty({ example: true, description: 'Of de gebruiker volgt deze business' })
  isFollowing: boolean;
}