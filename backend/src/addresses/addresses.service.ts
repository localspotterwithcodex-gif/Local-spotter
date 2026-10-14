import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsumerAddress } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

export const MAX_ADDRESSES_PER_CONSUMER = 10;

export interface AddressView {
  id: string;
  label: string;
  fullName: string;
  phone: string | null;
  street: string;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  countryCode: string;
  isDefault: boolean;
}

const toView = (a: ConsumerAddress): AddressView => ({
  id: a.id,
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  street: a.street,
  houseNumber: a.houseNumber,
  postalCode: a.postalCode,
  city: a.city,
  countryCode: a.countryCode,
  isDefault: a.isDefault,
});

/**
 * Saved delivery addresses of one consumer. Every query is scoped by the
 * authenticated consumer's profile id (taken from the JWT, never from the
 * request body) so one consumer can never read or change another's address.
 */
@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  private requireProfile(profileId?: string): string {
    if (!profileId) throw new BadRequestException('Geen consumentenprofiel gevonden');
    return profileId;
  }

  async list(profileId?: string): Promise<AddressView[]> {
    const id = this.requireProfile(profileId);
    const rows = await this.prisma.consumerAddress.findMany({
      where: { consumerProfileId: id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toView);
  }

  async create(profileId: string | undefined, dto: CreateAddressDto): Promise<AddressView> {
    const id = this.requireProfile(profileId);
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.consumerAddress.count({ where: { consumerProfileId: id, deletedAt: null } });
      if (count >= MAX_ADDRESSES_PER_CONSUMER) {
        throw new BadRequestException(`Maximaal ${MAX_ADDRESSES_PER_CONSUMER} adressen toegestaan`);
      }
      // The first address is always the default; otherwise only on request.
      const makeDefault = count === 0 || dto.isDefault === true;
      if (makeDefault) {
        await tx.consumerAddress.updateMany({
          where: { consumerProfileId: id, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await tx.consumerAddress.create({
        data: {
          consumerProfileId: id,
          label: dto.label.trim(),
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || null,
          street: dto.street.trim(),
          houseNumber: dto.houseNumber?.trim() || null,
          postalCode: dto.postalCode?.trim() || null,
          city: dto.city.trim(),
          countryCode: (dto.countryCode ?? 'NL').toUpperCase(),
          isDefault: makeDefault,
        },
      });
      return toView(created);
    });
  }

  async update(profileId: string | undefined, addressId: string, dto: UpdateAddressDto): Promise<AddressView> {
    const id = this.requireProfile(profileId);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.consumerAddress.findFirst({ where: { id: addressId, consumerProfileId: id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Adres niet gevonden');

      if (dto.isDefault === true && !existing.isDefault) {
        await tx.consumerAddress.updateMany({
          where: { consumerProfileId: id, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        });
      }
      // The default address cannot be un-defaulted directly; pick another one as default instead.
      const isDefault = dto.isDefault === true ? true : existing.isDefault;

      const updated = await tx.consumerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.label !== undefined && { label: dto.label.trim() }),
          ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
          ...(dto.street !== undefined && { street: dto.street.trim() }),
          ...(dto.houseNumber !== undefined && { houseNumber: dto.houseNumber.trim() || null }),
          ...(dto.postalCode !== undefined && { postalCode: dto.postalCode.trim() || null }),
          ...(dto.city !== undefined && { city: dto.city.trim() }),
          ...(dto.countryCode !== undefined && { countryCode: dto.countryCode.toUpperCase() }),
          isDefault,
        },
      });
      return toView(updated);
    });
  }

  async remove(profileId: string | undefined, addressId: string): Promise<{ deleted: true }> {
    const id = this.requireProfile(profileId);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.consumerAddress.findFirst({ where: { id: addressId, consumerProfileId: id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Adres niet gevonden');

      await tx.consumerAddress.update({ where: { id: addressId }, data: { deletedAt: new Date(), isDefault: false } });

      if (existing.isDefault) {
        // Promote the most recent remaining address so a default always exists.
        const next = await tx.consumerAddress.findFirst({
          where: { consumerProfileId: id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        if (next) await tx.consumerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return { deleted: true };
  }
}
