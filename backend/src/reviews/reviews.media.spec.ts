import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaStatus, ReviewStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { MediaCleanupService } from '../media/media-cleanup';

function make(review: Record<string, unknown>, readyAssets: string[] = []) {
  const prisma: any = {
    review: {
      findUnique: jest.fn(async () => review),
      update: jest.fn(async ({ data }: any) => ({ ...review, ...data })),
    },
    mediaAsset: { findMany: jest.fn(async ({ where }: any) => readyAssets.filter((id) => where.id.in.includes(id)).map((id) => ({ id }))) },
    reviewImage: { deleteMany: jest.fn(), createMany: jest.fn() },
    business: { findUnique: jest.fn(async () => ({ id: 'b1', deletedAt: null, ownerProfile: { userId: 'owner-1' } })) },
  };
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
  return { service: new ReviewsService(prisma, {} as never, {} as never), prisma };
}
const pending = { id: 'r1', businessId: 'b1', consumerProfileId: 'cp1', status: ReviewStatus.PENDING, deletedAt: null, orderId: 'o1', workshopId: null };

describe('review media (4.4)', () => {
  it('attaches only READY files from this review folder by its author, in order, then publishes a verified review', async () => {
    const { service, prisma } = make(pending, ['a1', 'a2']);
    const res = await service.attachMedia('r1', 'cp1', ['a2', 'a1']);
    expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toMatchObject({
      status: MediaStatus.READY,
      consumerProfileId: 'cp1',
      storagePath: { startsWith: 'shops/b1/reviews/r1/' },
    });
    expect(prisma.reviewImage.createMany).toHaveBeenCalledWith({ data: [{ reviewId: 'r1', mediaAssetId: 'a2', sortOrder: 0 }, { reviewId: 'r1', mediaAssetId: 'a1', sortOrder: 1 }] });
    expect(res.status).toBe(ReviewStatus.PUBLISHED);
  });

  it('a free-standing review keeps waiting for moderation; an empty list publishes a verified one without media', async () => {
    const free = make({ ...pending, orderId: null }, ['a1']);
    expect((await free.service.attachMedia('r1', 'cp1', ['a1'])).status).toBe(ReviewStatus.PENDING);
    const none = make(pending);
    expect((await none.service.attachMedia('r1', 'cp1', [])).status).toBe(ReviewStatus.PUBLISHED);
  });

  it('refuses unconfirmed or foreign files, someone else, and reviews that are no longer pending', async () => {
    await expect(make(pending, ['a1']).service.attachMedia('r1', 'cp1', ['a1', 'a-foreign'])).rejects.toBeInstanceOf(BadRequestException);
    await expect(make(pending).service.attachMedia('r1', 'cp-other', [])).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ ...pending, status: ReviewStatus.PUBLISHED }).service.attachMedia('r1', 'cp1', [])).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('shop reply to a review (3.3)', () => {
  const published = { businessId: 'b1', status: ReviewStatus.PUBLISHED, deletedAt: null };
  it('the shop owner (or an admin) replies; empty text removes the reply', async () => {
    const { service, prisma } = make(published);
    await service.replyToReview('b1', 'r1', { id: 'owner-1', role: 'BUSINESS_OWNER' }, '  Dank je wel!  ');
    expect(prisma.review.update.mock.calls[0][0].data).toMatchObject({ replyText: 'Dank je wel!', repliedByUserId: 'owner-1' });
    await service.replyToReview('b1', 'r1', { id: 'admin', role: 'SUPER_ADMIN' }, '');
    expect(prisma.review.update.mock.calls[1][0].data).toEqual({ replyText: null, repliedAt: null, repliedByUserId: null });
  });
  it("refuses another shop's owner, a review of another shop, and unpublished reviews", async () => {
    await expect(make(published).service.replyToReview('b1', 'r1', { id: 'owner-2', role: 'BUSINESS_OWNER' }, 'x')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({ ...published, businessId: 'b2' }).service.replyToReview('b1', 'r1', { id: 'owner-1', role: 'BUSINESS_OWNER' }, 'x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ ...published, status: ReviewStatus.PENDING }).service.replyToReview('b1', 'r1', { id: 'owner-1', role: 'BUSINESS_OWNER' }, 'x')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('media cleanup job', () => {
  it('removes old unconfirmed uploads and unused files per bucket, then marks them DELETED; no-op without Supabase', async () => {
    const prisma = {
      mediaAsset: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'p1', bucket: 'review-media', storagePath: 'shops/b/reviews/r/photos/x.jpg' }])
          .mockResolvedValueOnce([
            { id: 'o1', bucket: 'shop-media', storagePath: 'shops/b/icon/old.png' },
            { id: 'o2', bucket: 'shop-media', storagePath: 'shops/b/cover/old.png' },
          ]),
        updateMany: jest.fn(async ({ where }: any) => ({ count: where.id.in.length })),
      },
    };
    const storage = { remove: jest.fn(async () => undefined) };
    const res = await new MediaCleanupService(prisma as never, storage as never).run();
    expect(res).toEqual({ pendingRemoved: 1, orphansRemoved: 2 });
    expect(storage.remove).toHaveBeenCalledWith('shop-media', ['shops/b/icon/old.png', 'shops/b/cover/old.png']);
    expect(prisma.mediaAsset.findMany.mock.calls[0][0].where).toMatchObject({ status: MediaStatus.PENDING, createdAt: { lt: expect.any(Date) } });
    expect(await new MediaCleanupService(prisma as never, null).run()).toMatchObject({ pendingRemoved: 0, orphansRemoved: 0 });
  });

  it('keeps the rows when storage refuses (retried next run)', async () => {
    const prisma = { mediaAsset: { findMany: jest.fn().mockResolvedValueOnce([{ id: 'p1', bucket: 'b', storagePath: 'x/y.jpg' }]).mockResolvedValueOnce([]), updateMany: jest.fn() } };
    const res = await new MediaCleanupService(prisma as never, { remove: jest.fn().mockRejectedValue(new Error('down')) } as never).run();
    expect(res).toEqual({ pendingRemoved: 0, orphansRemoved: 0 });
    expect(prisma.mediaAsset.updateMany).not.toHaveBeenCalled();
  });
});
