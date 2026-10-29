import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConsumerProfileDto } from './dto/update-consumer-profile.dto';
import { UpdateBusinessOwnerProfileDto } from './dto/update-business-owner-profile.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getConsumerProfile(userId: string) {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        profileImageAsset: { select: { id: true, url: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Consumentenprofiel niet gevonden');
    }

    return profile;
  }

  async updateConsumerProfile(userId: string, dto: UpdateConsumerProfileDto) {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Consumentenprofiel niet gevonden');
    }

    await this.assertAssetExists(dto.profileImageAssetId);
    return this.prisma.consumerProfile.update({
      where: { userId },
      data: { ...dto },
      include: { profileImageAsset: { select: { id: true, url: true } } },
    });
  }

  async getBusinessOwnerProfile(userId: string) {
    const profile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        businesses: true,
        profileImageAsset: { select: { id: true, url: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Ondernemersprofiel niet gevonden');
    }

    return profile;
  }

  async updateBusinessOwnerProfile(userId: string, dto: UpdateBusinessOwnerProfileDto) {
    const profile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Ondernemersprofiel niet gevonden');
    }

    await this.assertAssetExists(dto.profileImageAssetId);
    return this.prisma.businessOwnerProfile.update({
      where: { userId },
      data: { ...dto },
      include: { profileImageAsset: { select: { id: true, url: true } } },
    });
  }

  /** A profile picture must be an image that went through POST /media/images (null/undefined = no change/removal). */
  private async assertAssetExists(assetId: string | null | undefined) {
    if (!assetId) return;
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { id: true, mimeType: true } });
    if (!asset || !asset.mimeType.startsWith('image/')) throw new BadRequestException('Unknown profile image');
  }
}
