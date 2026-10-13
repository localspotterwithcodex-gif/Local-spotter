import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopRegistrationDto } from './dto/create-shop-registration.dto';

@Injectable()
export class ShopRegistrationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShopRegistrationDto) {
    const registration = await this.prisma.shopRegistration.create({
      data: {
        shopName: dto.shopName.trim(),
        contactPersonName: dto.contactPersonName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        shopAddress: dto.shopAddress.trim(),
        websiteInstagram: dto.websiteInstagram?.trim() || null,
        shopType: dto.shopType.trim(),
        otherShopType: dto.otherShopType?.trim() || null,
        productCount: dto.productCount?.trim() || null,
        sellsOnline: dto.sellsOnline?.trim() || null,
        otherSellsOnline: dto.otherSellsOnline?.trim() || null,
        webshopPos: dto.webshopPos?.trim() || null,
        otherWebshopPos: dto.otherWebshopPos?.trim() || null,
        pilotInterest: dto.pilotInterest.trim(),
        valuableFeatures: dto.valuableFeatures ?? [],
        otherFeature: dto.otherFeature?.trim() || null,
        monthlyPrice: dto.monthlyPrice?.trim() || null,
        pricingModel: dto.pricingModel?.trim() || null,
        routeInterest: dto.routeInterest?.trim() || null,
        routeOffer: dto.routeOffer?.trim() || null,
        otherRouteOffer: dto.otherRouteOffer?.trim() || null,
        biggestChallenge: dto.biggestChallenge?.trim() || null,
      },
    });
    return { success: true, id: registration.id };
  }

  // Used by the admin panel to review incoming "join as a shop" leads.
  async findAll() {
    return this.prisma.shopRegistration.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
