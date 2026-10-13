import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { BusinessStatus, UserRole } from '@prisma/client';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async create(user: any, dto: CreateBusinessDto) {
    if (user.role !== UserRole.BUSINESS_OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Alleen geregistreerde ondernemers kunnen een winkel aanmaken');
    }

    // Get owner profile
    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile) {
      throw new BadRequestException('Geen ondernemersprofiel gevonden voor deze gebruiker');
    }

    // Generate unique slug
    let slug = this.slugify(dto.name);
    const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.business.create({
      data: {
        ownerProfileId: ownerProfile.id,
        name: dto.name,
        slug,
        description: dto.description || null,
        phone: dto.phone || null,
        email: dto.email || null,
        kvkNumber: dto.kvkNumber,
        categoryId: dto.categoryId || null,
        state: dto.state,
        city: dto.city,
        street: dto.address,
        address: dto.address,
        postalCode: dto.postalCode || null,
        latitude: dto.latitude ? dto.latitude : null,
        longitude: dto.longitude ? dto.longitude : null,
        status: BusinessStatus.PENDING_APPROVAL,
      },
      include: {
        category: true,
        hours: true,
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  async getMyBusinesses(user: any) {
    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile) {
      return [];
    }

    return this.prisma.business.findMany({
      where: { ownerProfileId: ownerProfile.id, deletedAt: null },
      include: {
        category: true,
        hours: true,
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicBusinessByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const business = await this.prisma.business.findFirst({
      where: {
        OR: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }],
        deletedAt: null,
      },
      include: {
        category: true,
        hours: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    return business;
  }

  async update(id: string, user: any, dto: UpdateBusinessDto) {
    const business = await this.verifyOwnership(id, user);

    let slug = business.slug;
    if (dto.name && dto.name !== business.name) {
      slug = this.slugify(dto.name);
      const existingSlug = await this.prisma.business.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existingSlug) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    return this.prisma.business.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description !== undefined ? dto.description : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        email: dto.email !== undefined ? dto.email : undefined,
        kvkNumber: dto.kvkNumber !== undefined ? dto.kvkNumber : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        state: dto.state !== undefined ? dto.state : undefined,
        city: dto.city !== undefined ? dto.city : undefined,
        street: dto.address !== undefined ? dto.address : undefined,
        address: dto.address !== undefined ? dto.address : undefined,
        postalCode: dto.postalCode !== undefined ? dto.postalCode : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
      },
      include: {
        category: true,
        hours: true,
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  async updateStatus(id: string, user: any, dto: UpdateBusinessStatusDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    // Business Owners can set DRAFT or PENDING_APPROVAL for their own business.
    // Super Admins can set any status (ACTIVE, SUSPENDED, DISABLED).
    if (user.role !== UserRole.SUPER_ADMIN) {
      await this.verifyOwnership(id, user);
      if (dto.status !== BusinessStatus.DRAFT && dto.status !== BusinessStatus.PENDING_APPROVAL) {
        throw new ForbiddenException('Alleen beheerders kunnen winkels activeren of schorsen');
      }
    }

    return this.prisma.business.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async getCategories() {
    return this.prisma.businessCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateHours(id: string, user: any, dto: UpdateBusinessHoursDto) {
    await this.verifyOwnership(id, user);

    // Delete existing & create updated weekly hours in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.businessHours.deleteMany({
        where: { businessId: id },
      });

      if (dto.hours && dto.hours.length > 0) {
        await tx.businessHours.createMany({
          data: dto.hours.map((item) => ({
            businessId: id,
            dayOfWeek: item.dayOfWeek,
            openTime: item.openTime || null,
            closeTime: item.closeTime || null,
            isClosed: item.isClosed,
          })),
        });
      }
    });

    return this.prisma.businessHours.findMany({
      where: { businessId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getHours(id: string) {
    return this.prisma.businessHours.findMany({
      where: { businessId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  private async verifyOwnership(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { ownerProfile: true },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return business;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile || business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException('Je bent niet gemachtigd om deze winkel te bewerken');
    }

    return business;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
