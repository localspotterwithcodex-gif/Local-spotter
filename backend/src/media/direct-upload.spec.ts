import { ForbiddenException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { MediaPurpose, MediaStatus, ReviewStatus, UserRole } from '@prisma/client';
import { DirectUploadService } from './direct-upload.service';
import { detectMp4, mp4DurationSeconds, storagePath } from './storage-layout';
import { SupabaseStorageClient } from './supabase-storage';

// ---------- synthetic files ----------
const box = (type: string, body: Buffer) => {
  const h = Buffer.alloc(8);
  h.writeUInt32BE(8 + body.length, 0);
  h.write(type, 4, 'ascii');
  return Buffer.concat([h, body]);
};
const mvhd = (seconds: number) => {
  const b = Buffer.alloc(100);
  b.writeUInt32BE(0, 0); // version 0 + flags
  b.writeUInt32BE(1000, 12); // timescale
  b.writeUInt32BE(seconds * 1000, 16); // duration
  return box('mvhd', b);
};
const ftyp = (brand = 'isom') => box('ftyp', Buffer.concat([Buffer.from(brand, 'ascii'), Buffer.alloc(8)]));
const mp4 = (seconds: number, moovFirst = false) => {
  const moov = box('moov', mvhd(seconds));
  const mdat = box('mdat', Buffer.alloc(5000));
  return moovFirst ? Buffer.concat([ftyp(), moov, mdat]) : Buffer.concat([ftyp(), mdat, moov]);
};
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const readerOf = (buf: Buffer) => async (s: number, l: number) => buf.subarray(s, s + l);

describe('MP4 checks', () => {
  it('reads the duration whether the moov box is at the start or the end', async () => {
    for (const f of [mp4(25), mp4(25, true)]) expect(await mp4DurationSeconds(readerOf(f), f.length)).toBe(25);
    expect(await mp4DurationSeconds(readerOf(JPEG), JPEG.length)).toBeNull();
  });
  it('accepts MP4 and refuses QuickTime and image containers', () => {
    expect(detectMp4(mp4(5))).toBe(true);
    expect(detectMp4(Buffer.concat([ftyp('qt  '), Buffer.alloc(10)]))).toBe(false);
    expect(detectMp4(Buffer.concat([ftyp('avif'), Buffer.alloc(10)]))).toBe(false);
    expect(detectMp4(JPEG)).toBe(false);
  });
});

describe('folder layout', () => {
  it('keeps shop icons and review media in different folders, per shop', () => {
    expect(storagePath(MediaPurpose.SHOP_ICON, { businessId: 'b1' }, 'f', 'png')).toBe('shops/b1/icon/f.png');
    expect(storagePath(MediaPurpose.REVIEW_PHOTO, { businessId: 'b1', reviewId: 'r1' }, 'f', 'jpg')).toBe('shops/b1/reviews/r1/photos/f.jpg');
    expect(storagePath(MediaPurpose.REVIEW_VIDEO, { businessId: 'b1', reviewId: 'r1' }, 'f', 'mp4')).toBe('shops/b1/reviews/r1/videos/f.mp4');
    expect(storagePath(MediaPurpose.PRODUCT_IMAGE, { businessId: 'b1', productId: 'p1' }, 'f', 'webp')).toBe('shops/b1/products/p1/f.webp');
    expect(storagePath(MediaPurpose.CHAT_ATTACHMENT, { conversationId: 'c1' }, 'f', 'jpg')).toBe('conversations/c1/f.jpg');
  });
});

describe('SupabaseStorageClient (REST)', () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const respond = (status: number, body: unknown = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  const client = (responses: Response[]) =>
    new SupabaseStorageClient({
      url: 'https://ref.supabase.co/',
      serviceKey: 'service-key',
      fetchFn: (async (url: string, init: RequestInit) => (calls.push({ url, init }), responses.shift()!)) as never,
    });
  beforeEach(() => (calls.length = 0));

  it('signs an upload with apikey + bearer and returns the absolute URL with its token', async () => {
    const res = await client([respond(200, { url: '/object/upload/sign/shop-media/shops/b1/icon/f.png?token=abc' })]).signUpload('shop-media', 'shops/b1/icon/f.png');
    expect(calls[0].url).toBe('https://ref.supabase.co/storage/v1/object/upload/sign/shop-media/shops/b1/icon/f.png');
    expect(calls[0].init).toMatchObject({ method: 'POST', headers: { apikey: 'service-key', Authorization: 'Bearer service-key' } });
    expect(res).toEqual({ signedUrl: 'https://ref.supabase.co/storage/v1/object/upload/sign/shop-media/shops/b1/icon/f.png?token=abc', token: 'abc' });
  });

  it('info: size and type, null when missing; ranged reads; DELETE with prefixes; buckets created or updated', async () => {
    const c = client([
      respond(200, { size: 1234, content_type: 'image/png' }),
      respond(404, { error: 'not found' }),
      new Response(Buffer.from('abc'), { status: 206 }),
      respond(200, []),
      respond(400, { error: 'exists' }),
      respond(200, { message: 'Successfully updated' }),
    ]);
    expect(await c.info('shop-media', 'a/b.png')).toEqual({ size: 1234, contentType: 'image/png' });
    expect(await c.info('shop-media', 'a/missing.png')).toBeNull();
    expect((await c.readRange('shop-media', 'a/b.png', 10, 3)).toString()).toBe('abc');
    expect((calls[2].init.headers as Record<string, string>).Range).toBe('bytes=10-12');
    await c.remove('shop-media', ['a/b.png']);
    expect(calls[3].init).toMatchObject({ method: 'DELETE', body: JSON.stringify({ prefixes: ['a/b.png'] }) });
    expect(await c.ensureBucket({ id: 'shop-media', public: true, fileSizeLimit: 10, allowedMimeTypes: ['image/png'] })).toBe('updated');
    expect(JSON.parse(calls[5].init.body as string)).toMatchObject({ id: 'shop-media', public: true, file_size_limit: 10, allowed_mime_types: ['image/png'] });
  });

  it('refuses unsafe object paths before any request', async () => {
    await expect(client([]).signUpload('shop-media', '../secrets')).rejects.toThrow('Unsafe');
    expect(() => client([]).publicUrl('shop-media', 'a/../../b')).toThrow('Unsafe');
  });
});

// ---------- DirectUploadService ----------
const owner = { id: 'u-owner', role: UserRole.BUSINESS_OWNER, profileId: 'op1' };
const consumer = { id: 'u-cons', role: UserRole.CONSUMER, profileId: 'cp1' };

function make(opts: { member?: boolean; shopVideo?: boolean; reviewPhotos?: number; productImages?: number } = {}) {
  const objects = new Map<string, Buffer>();
  const storage = {
    publicUrl: (b: string, p: string) => `https://ref.supabase.co/storage/v1/object/public/${b}/${p}`,
    signUpload: jest.fn(async (b: string, p: string) => ({ signedUrl: `https://ref.supabase.co/storage/v1/object/upload/sign/${b}/${p}?token=t`, token: 't' })),
    info: jest.fn(async (b: string, p: string) => (objects.has(`${b}/${p}`) ? { size: objects.get(`${b}/${p}`)!.length, contentType: null } : null)),
    readRange: jest.fn(async (b: string, p: string, s: number, l: number) => objects.get(`${b}/${p}`)!.subarray(s, s + l)),
    remove: jest.fn(async (b: string, paths: string[]) => paths.forEach((p) => objects.delete(`${b}/${p}`))),
  };
  const assets = new Map<string, any>();
  const prisma = {
    mediaAsset: {
      create: jest.fn(async ({ data }: any) => (assets.set(`a${assets.size + 1}`, { id: `a${assets.size + 1}`, ...data }), assets.get(`a${assets.size}`))),
      findUnique: jest.fn(async ({ where }: any) => assets.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(assets.get(where.id), data)),
      updateMany: jest.fn(async ({ where, data }: any) => (assets.get(where.id).status === where.status ? (Object.assign(assets.get(where.id), data), { count: 1 }) : { count: 0 })),
      count: jest.fn(async () => 0),
    },
    review: { findUnique: jest.fn(async () => ({ consumerProfileId: 'cp1', businessId: 'b1', status: ReviewStatus.PENDING, deletedAt: null })) },
    product: { findUnique: jest.fn(async () => ({ businessId: 'b1', deletedAt: null })) },
    productImage: { count: jest.fn(async () => opts.productImages ?? 0) },
    conversation: { findUnique: jest.fn(async () => ({ consumerProfileId: 'cp-other', businessId: 'b9' })) },
  };
  const employees = { canAccessShop: jest.fn(async () => opts.member ?? true) };
  const limits: Record<string, number> = { maxProductImages: 3, maxReviewPhotos: opts.reviewPhotos ?? 8, maxReviewVideos: 2 };
  const entitlements = {
    assertFeature: jest.fn(async () => {
      if (opts.shopVideo === false) throw new ForbiddenException({ code: 'PLAN_FEATURE_REQUIRED' });
    }),
    assertWithinLimit: jest.fn(async (_b: string, limit: string, wanted: number) => {
      if (wanted > limits[limit]) throw new ForbiddenException({ code: 'PLAN_FEATURE_REQUIRED', limit });
    }),
  };
  const service = new DirectUploadService(prisma as never, storage as never, employees as never, entitlements as never);
  const put = (assetId: string, data: Buffer) => {
    const a = assets.get(assetId);
    objects.set(`${a.bucket}/${a.storagePath}`, data);
  };
  return { service, assets, storage, put, employees };
}

describe('DirectUploadService', () => {
  it('ticket: signed URL for a fixed path, PENDING asset with shop FK; confirm: real type checked, READY', async () => {
    const t = make();
    const ticket = await t.service.createTicket(owner, { purpose: MediaPurpose.SHOP_ICON, contentType: 'image/png', size: 108, businessId: 'b1' });
    const asset = t.assets.get(ticket.assetId);
    expect(asset).toMatchObject({ bucket: 'shop-media', status: MediaStatus.PENDING, businessId: 'b1', uploadedByUserId: 'u-owner' });
    expect(asset.storagePath).toMatch(/^shops\/b1\/icon\/[0-9a-f-]{36}\.png$/);
    expect(ticket.uploadUrl).toContain(`/object/upload/sign/shop-media/${asset.storagePath}`);
    t.put(ticket.assetId, PNG);
    await expect(t.service.confirm(owner, ticket.assetId)).resolves.toMatchObject({ id: ticket.assetId, url: expect.stringContaining('/object/public/shop-media/shops/b1/icon/') });
    expect(t.assets.get(ticket.assetId)).toMatchObject({ status: MediaStatus.READY, fileSize: PNG.length });
  });

  it('confirm rejects and deletes a file whose real type differs (e.g. a JPEG or a script sent as PNG)', async () => {
    const t = make();
    const { assetId } = await t.service.createTicket(owner, { purpose: MediaPurpose.PRODUCT_IMAGE, contentType: 'image/png', size: 100, businessId: 'b1', productId: 'p1' });
    t.put(assetId, JPEG);
    await expect(t.service.confirm(owner, assetId)).rejects.toThrow('geen ondersteunde afbeelding');
    expect(t.assets.get(assetId).status).toBe(MediaStatus.REJECTED);
    expect(t.storage.remove).toHaveBeenCalled();
  });

  it('refuses wrong type, too large, SVG, other shops, missing plan features and over-limit counts', async () => {
    const t = make();
    await expect(t.service.createTicket(owner, { purpose: MediaPurpose.SHOP_ICON, contentType: 'image/svg+xml', size: 10, businessId: 'b1' })).rejects.toMatchObject({ response: { code: 'UNSUPPORTED_TYPE' } });
    await expect(t.service.createTicket(owner, { purpose: MediaPurpose.SHOP_ICON, contentType: 'image/png', size: 6 * 1048576, businessId: 'b1' })).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(make({ member: false }).service.createTicket(owner, { purpose: MediaPurpose.SHOP_COVER, contentType: 'image/png', size: 10, businessId: 'b2' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({ shopVideo: false }).service.createTicket(owner, { purpose: MediaPurpose.SHOP_VIDEO, contentType: 'video/mp4', size: 10, businessId: 'b1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({ productImages: 3 }).service.createTicket(owner, { purpose: MediaPurpose.PRODUCT_IMAGE, contentType: 'image/png', size: 10, businessId: 'b1', productId: 'p1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.createTicket(owner, { purpose: MediaPurpose.SHOP_VIDEO, contentType: 'video/quicktime', size: 10, businessId: 'b1' })).rejects.toMatchObject({ response: { code: 'UNSUPPORTED_TYPE' } });
  });

  it('review media: only the author of a pending review, within the shop plan (WEBSHOP allows none)', async () => {
    const t = make();
    const ok = await t.service.createTicket(consumer, { purpose: MediaPurpose.REVIEW_PHOTO, contentType: 'image/jpeg', size: 10, reviewId: 'r1' });
    expect(t.assets.get(ok.assetId)).toMatchObject({ businessId: 'b1', consumerProfileId: 'cp1' });
    expect(t.assets.get(ok.assetId).storagePath).toMatch(/^shops\/b1\/reviews\/r1\/photos\//);
    await expect(t.service.createTicket(owner, { purpose: MediaPurpose.REVIEW_PHOTO, contentType: 'image/jpeg', size: 10, reviewId: 'r1' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(t.service.createTicket({ ...consumer, profileId: 'cp2' }, { purpose: MediaPurpose.REVIEW_PHOTO, contentType: 'image/jpeg', size: 10, reviewId: 'r1' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(make({ reviewPhotos: 0 }).service.createTicket(consumer, { purpose: MediaPurpose.REVIEW_PHOTO, contentType: 'image/jpeg', size: 10, reviewId: 'r1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(t.service.createTicket(consumer, { purpose: MediaPurpose.REVIEW_VIDEO, contentType: 'video/mp4', size: 21 * 1048576, reviewId: 'r1' })).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('review video: confirmed only when it is an MP4 of at most 30 s (D4)', async () => {
    const t = make();
    const long = await t.service.createTicket(consumer, { purpose: MediaPurpose.REVIEW_VIDEO, contentType: 'video/mp4', size: 6000, reviewId: 'r1' });
    t.put(long.assetId, mp4(31));
    await expect(t.service.confirm(consumer, long.assetId)).rejects.toThrow('langer dan 30 seconden');
    const short = await t.service.createTicket(consumer, { purpose: MediaPurpose.REVIEW_VIDEO, contentType: 'video/mp4', size: 6000, reviewId: 'r1' });
    t.put(short.assetId, mp4(12));
    await t.service.confirm(consumer, short.assetId);
    expect(t.assets.get(short.assetId)).toMatchObject({ status: MediaStatus.READY, durationSeconds: 12 });
  });

  it('chat: only participants; someone else cannot confirm my upload', async () => {
    const t = make({ member: false });
    await expect(t.service.createTicket(consumer, { purpose: MediaPurpose.CHAT_ATTACHMENT, contentType: 'image/png', size: 10, conversationId: 'c1' })).rejects.toBeInstanceOf(NotFoundException);
    const u = make();
    const { assetId } = await u.service.createTicket(owner, { purpose: MediaPurpose.SHOP_ICON, contentType: 'image/png', size: 10, businessId: 'b1' });
    await expect(u.service.confirm({ ...owner, id: 'someone-else' }, assetId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is off (409 DIRECT_UPLOAD_DISABLED) without STORAGE_PROVIDER=supabase', async () => {
    const off = new DirectUploadService({} as never, null, {} as never, {} as never);
    expect(off.isEnabled()).toBe(false);
    await expect(off.createTicket(owner, { purpose: MediaPurpose.SHOP_ICON, contentType: 'image/png', size: 1, businessId: 'b1' })).rejects.toMatchObject({ response: { code: 'DIRECT_UPLOAD_DISABLED' } });
  });
});
