import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { FollowBusinessDto } from './dto/follow-business.dto';
import { FollowStatusDto } from './dto/follow-status.dto';
import { ConsumerProfile } from '@prisma/client';

@Injectable()
export class FollowersService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  async followBusiness(
    businessId: string,
    consumerProfileId: string,
  ): Promise<FollowStatusDto> {
    // Check Workshop entitlement
    const hasFeature = await this.entitlementService.hasFeature(
      businessId,
      'WORKSHOPS',
    );
    if (!hasFeature) {
      throw new ForbiddenException(
        'Je hebt een WORKSHOP-abonnement nodig om bedrijven te volgen',
      );
    }

    // Check if already following - idempotent: return current status
    const existingFollow = await this.prisma.follower.findUnique({
      where: {
        consumerProfileId_businessId: {
          consumerProfileId,
          businessId,
        },
      },
    });

    if (existingFollow) {
      return { isFollowing: true };
    }

    // Create the follow relationship
    await this.prisma.follower.create({
      data: {
        consumerProfileId,
        businessId,
      },
    });

    return { isFollowing: true };
  }

  async unfollowBusiness(
    businessId: string,
    consumerProfileId: string,
  ): Promise<FollowStatusDto> {
    // Check if following
    const follow = await this.prisma.follower.findUnique({
      where: {
        consumerProfileId_businessId: {
          consumerProfileId,
          businessId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException(
        'Je volgde deze business niet',
      );
    }

    // Only the consumer who follows can unfollow
    if (follow.consumerProfileId !== consumerProfileId) {
      throw new ForbiddenException(
        'Je kunt alleen je eigen follow-relatie verwijderen',
      );
    }

    await this.prisma.follower.delete({
      where: {
        id: follow.id,
      },
    });

    return { isFollowing: false };
  }

  async checkFollowStatus(
    businessId: string,
    consumerProfileId: string,
  ): Promise<FollowStatusDto> {
    const follow = await this.prisma.follower.findUnique({
      where: {
        consumerProfileId_businessId: {
          consumerProfileId,
          businessId,
        },
      },
    });

    return { isFollowing: !!follow };
  }

  async getFollowedBusinesses(
    consumerProfileId: string,
  ): Promise<{ id: string; name: string; followed: boolean }[]> {
    const followers = await this.prisma.follower.findMany({
      where: { consumerProfileId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return followers.map((f) => ({
      id: f.business.id,
      name: f.business.name,
      followed: true,
    }));
  }
}