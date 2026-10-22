import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BusinessStatus, UserRole } from '@prisma/client';
import { BusinessesService } from './businesses.service';

function make(status: BusinessStatus) {
  const business = { id: 'b1', status, ownerProfileId: 'op-1', deletedAt: null, pickupEnabled: true, shippingEnabled: true, localDeliveryEnabled: false };
  const prisma = {
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'op-1', userId: 'owner-1' }) },
    business: {
      findUnique: jest.fn().mockResolvedValue(business),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data })),
    },
  };
  return { service: new BusinessesService(prisma as never, { backfill: jest.fn().mockResolvedValue(undefined), translateFields: jest.fn().mockResolvedValue({ sourceLocale: null, translations: null }) } as never), prisma };
}
const owner = { id: 'owner-1', role: UserRole.BUSINESS_OWNER };
const admin = { id: 'admin-1', role: UserRole.SUPER_ADMIN };

describe('BusinessesService.updateStatus', () => {
  it('lets an owner move their own business between DRAFT and PENDING_APPROVAL', async () => {
    const { service, prisma } = make(BusinessStatus.DRAFT);
    await service.updateStatus('b1', owner, { status: BusinessStatus.PENDING_APPROVAL });
    expect(prisma.business.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: BusinessStatus.PENDING_APPROVAL } });
  });

  it('never lets an owner activate their own business', async () => {
    const { service, prisma } = make(BusinessStatus.PENDING_APPROVAL);
    await expect(service.updateStatus('b1', owner, { status: BusinessStatus.ACTIVE })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it.each([BusinessStatus.SUSPENDED, BusinessStatus.DISABLED])('owner cannot lift an admin %s block', async (blocked) => {
    const { service, prisma } = make(blocked);
    await expect(service.updateStatus('b1', owner, { status: BusinessStatus.DRAFT })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('lets a super admin set any status, including lifting a suspension', async () => {
    const { service, prisma } = make(BusinessStatus.SUSPENDED);
    await service.updateStatus('b1', admin, { status: BusinessStatus.ACTIVE });
    expect(prisma.business.update).toHaveBeenCalled();
  });
});

describe('BusinessesService live counts', () => {
  it('reports real follower/review numbers, ignoring stale stored columns', async () => {
    const prisma = {
      business: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'b1', followerCount: 145, ratingCount: 12, averageRating: 0 },
          { id: 'b2', followerCount: 3, ratingCount: 0, averageRating: 5 },
        ]),
      },
      follower: { groupBy: jest.fn().mockResolvedValue([{ businessId: 'b1', _count: { _all: 2 } }]) },
      review: {
        groupBy: jest.fn().mockResolvedValue([{ businessId: 'b1', _avg: { rating: 4.25 }, _count: { _all: 4 } }]),
      },
    };
    const service = new BusinessesService(prisma as never, { backfill: jest.fn() } as never);
    const result = await service.getPublicBusinesses({} as never);
    expect(result[0]).toMatchObject({ id: 'b1', followerCount: 2, averageRating: 4.3, ratingCount: 4 });
    expect(result[1]).toMatchObject({ id: 'b2', followerCount: 0, averageRating: 0, ratingCount: 0 });
  });
});

describe('BusinessesService.update store links', () => {
  it('saves website and social links and clears them with null', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    await service.update('b1', owner, { websiteUrl: 'https://shop.example.nl', instagramUrl: null as never });
    const data = prisma.business.update.mock.calls[0][0].data;
    expect(data.websiteUrl).toBe('https://shop.example.nl');
    expect(data.instagramUrl).toBeNull();
    expect(data.facebookUrl).toBeUndefined();
  });
});

describe('BusinessesService.update fulfilment settings', () => {
  it('saves the fulfilment options and fees', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    await service.update('b1', owner, { localDeliveryEnabled: true, localDeliveryFee: 3.5, localDeliveryRadiusKm: 8, shippingFee: null, freeShippingThreshold: 75 });
    const data = prisma.business.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ localDeliveryEnabled: true, localDeliveryFee: 3.5, localDeliveryRadiusKm: 8, shippingFee: null, freeShippingThreshold: 75 });
  });

  it('refuses to switch off every fulfilment method', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    await expect(service.update('b1', owner, { pickupEnabled: false, shippingEnabled: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('allows switching one method off while another stays on', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    await service.update('b1', owner, { shippingEnabled: false });
    expect(prisma.business.update.mock.calls[0][0].data.shippingEnabled).toBe(false);
  });
});

describe('BusinessesService.update 360° photo', () => {
  it('saves a known panorama asset and lets the owner remove it with null', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    (prisma as any).mediaAsset = { findUnique: jest.fn().mockResolvedValue({ id: '8c1f1a3e-6a0b-4b8e-9d57-1f6f3f7a2b11' }) };
    await service.update('b1', owner, { panoramaAssetId: '8c1f1a3e-6a0b-4b8e-9d57-1f6f3f7a2b11' });
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ panoramaAssetId: '8c1f1a3e-6a0b-4b8e-9d57-1f6f3f7a2b11' }) }));
    await service.update('b1', owner, { panoramaAssetId: null });
    expect(prisma.business.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ panoramaAssetId: null }) }));
  });

  it('rejects an asset id that was never uploaded', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    (prisma as any).mediaAsset = { findUnique: jest.fn().mockResolvedValue(null) };
    await expect(service.update('b1', owner, { panoramaAssetId: '8c1f1a3e-6a0b-4b8e-9d57-1f6f3f7a2b11' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });
});

describe('BusinessesService.update shop video', () => {
  const VIDEO_ID = '8c1f1a3e-6a0b-4b8e-9d57-1f6f3f7a2b12';

  it('saves a registered video asset and lets the owner remove it with null', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    (prisma as any).mediaAsset = { findUnique: jest.fn().mockResolvedValue({ id: VIDEO_ID, mimeType: 'video/mp4' }) };
    await service.update('b1', owner, { videoAssetId: VIDEO_ID });
    expect(prisma.business.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ videoAssetId: VIDEO_ID }) }));
    await service.update('b1', owner, { videoAssetId: null });
    expect(prisma.business.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ videoAssetId: null }) }));
  });

  it('rejects an unknown asset, or an image used as the video', async () => {
    const { service, prisma } = make(BusinessStatus.ACTIVE);
    (prisma as any).mediaAsset = { findUnique: jest.fn().mockResolvedValue(null) };
    await expect(service.update('b1', owner, { videoAssetId: VIDEO_ID })).rejects.toBeInstanceOf(BadRequestException);
    (prisma as any).mediaAsset = { findUnique: jest.fn().mockResolvedValue({ mimeType: 'image/jpeg' }) };
    await expect(service.update('b1', owner, { videoAssetId: VIDEO_ID })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });
});
