import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    return this.prisma.consumerProfile.update({
      where: { userId },
      data: { ...dto },
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

    return this.prisma.businessOwnerProfile.update({
      where: { userId },
      data: { ...dto },
    });
  }
}
