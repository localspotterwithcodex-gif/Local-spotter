import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'localspotter_super_secret_jwt_key_2026_change_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        consumerProfile: true,
        businessOwnerProfile: true,
      },
    });

    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('User account inactive, suspended, or not found');
    }

    const profileId =
      user.role === 'CONSUMER'
        ? user.consumerProfile?.id
        : user.role === 'BUSINESS_OWNER'
        ? user.businessOwnerProfile?.id
        : undefined;

    const displayName =
      user.role === 'CONSUMER'
        ? user.consumerProfile?.displayName
        : user.role === 'BUSINESS_OWNER'
        ? user.businessOwnerProfile?.displayName
        : 'Super Admin';

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profileId,
      displayName,
    };
  }
}
