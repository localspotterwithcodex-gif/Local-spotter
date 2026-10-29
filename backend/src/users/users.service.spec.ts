import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from './users.service';
import { UpdateConsumerProfileDto } from './dto/update-consumer-profile.dto';
import { UpdateBusinessOwnerProfileDto } from './dto/update-business-owner-profile.dto';

const ASSET = '3f2b8a4e-5d1c-4b7a-9c3e-0a1b2c3d4e5f';

function make(asset: { id: string; mimeType: string } | null = { id: ASSET, mimeType: 'image/webp' }, profile: object | null = { id: 'p1' }) {
  const prisma = {
    consumerProfile: { findUnique: jest.fn().mockResolvedValue(profile), update: jest.fn().mockImplementation(async (a) => ({ id: 'p1', ...a.data })) },
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue(profile), update: jest.fn().mockImplementation(async (a) => ({ id: 'p1', ...a.data })) },
    mediaAsset: { findUnique: jest.fn().mockResolvedValue(asset) },
  };
  return { prisma, service: new UsersService(prisma as never) };
}

describe('UsersService profile picture', () => {
  it('saves an existing image asset on the consumer profile and returns it', async () => {
    const { prisma, service } = make();
    await service.updateConsumerProfile('u1', { displayName: 'Sophie', profileImageAssetId: ASSET });
    expect(prisma.consumerProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: { displayName: 'Sophie', profileImageAssetId: ASSET }, include: { profileImageAsset: { select: { id: true, url: true } } } }));
  });

  it('removes the picture when null is sent, without looking up an asset', async () => {
    const { prisma, service } = make();
    await service.updateConsumerProfile('u1', { profileImageAssetId: null });
    expect(prisma.mediaAsset.findUnique).not.toHaveBeenCalled();
    expect(prisma.consumerProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: { profileImageAssetId: null } }));
  });

  it('rejects an unknown asset and a non-image asset (e.g. a shop video) for consumers and owners', async () => {
    for (const asset of [null, { id: ASSET, mimeType: 'video/mp4' }]) {
      const { prisma, service } = make(asset);
      await expect(service.updateConsumerProfile('u1', { profileImageAssetId: ASSET })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateBusinessOwnerProfile('u1', { profileImageAssetId: ASSET })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.consumerProfile.update).not.toHaveBeenCalled();
      expect(prisma.businessOwnerProfile.update).not.toHaveBeenCalled();
    }
  });

  it('still answers 404 when the profile does not exist', async () => {
    const { service } = make(undefined, null);
    await expect(service.updateConsumerProfile('u1', { displayName: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('profile DTO validation', () => {
  it('accepts a uuid or null and rejects anything else', async () => {
    for (const Dto of [UpdateConsumerProfileDto, UpdateBusinessOwnerProfileDto]) {
      expect(await validate(plainToInstance(Dto, { profileImageAssetId: ASSET }))).toHaveLength(0);
      expect(await validate(plainToInstance(Dto, { profileImageAssetId: null }))).toHaveLength(0);
      expect(await validate(plainToInstance(Dto, { profileImageAssetId: 'not-a-uuid' }))).not.toHaveLength(0);
    }
  });
});
