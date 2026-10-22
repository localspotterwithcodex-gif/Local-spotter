import { BadRequestException, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MediaService } from './media.service';
import { detectImageType, MAX_IMAGE_BYTES } from './image-validation';
import { optimiseDeliveryUrl } from './image-storage';
import { videoDeliveryUrl } from './video-storage';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const user = { id: 'u1', role: UserRole.BUSINESS_OWNER } as any;

describe('detectImageType', () => {
  it('detects common raster formats by magic bytes and rejects everything else', () => {
    expect(detectImageType(JPEG)?.mime).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBP', 'ascii'))?.mime).toBe('image/webp');
    expect(detectImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))?.mime).toBe('image/gif');
    expect(detectImageType(Buffer.from('BM\0\0'))?.mime).toBe('image/bmp');
    expect(detectImageType(Buffer.from('\0\0\0\x18ftypavif', 'binary'))?.mime).toBe('image/avif');
    expect(detectImageType(Buffer.from('\0\0\0\x18ftypheic', 'binary'))?.mime).toBe('image/heic');
    expect(detectImageType(Buffer.from('plain text'))).toBeNull();
  });
});

describe('MediaService.uploadImage', () => {
  const make = (configured = true) => {
    const prisma = { mediaAsset: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'm1', ...data })) } };
    const storage = { isConfigured: () => configured, upload: jest.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/x/image/upload/a.jpg', bytes: 8 }) };
    return { svc: new MediaService(prisma as any, storage as any, {} as any), prisma, storage };
  };

  it('uploads a valid image under a user-scoped folder and records the asset', async () => {
    const { svc, storage, prisma } = make();
    const out = await svc.uploadImage({ buffer: JPEG, size: JPEG.length }, user);
    expect(out).toEqual({ id: 'm1', url: 'https://res.cloudinary.com/x/image/upload/a.jpg' });
    expect(storage.upload).toHaveBeenCalledWith(JPEG, 'image/jpeg', 'localspotter/users/u1');
    expect(prisma.mediaAsset.create).toHaveBeenCalled();
  });

  it('answers 503 when storage is not configured', async () => {
    await expect(make(false).svc.uploadImage({ buffer: JPEG, size: 8 }, user)).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects missing, oversized and non-image files', async () => {
    const { svc, storage } = make();
    await expect(svc.uploadImage(undefined, user)).rejects.toThrow(BadRequestException);
    await expect(svc.uploadImage({ buffer: JPEG, size: MAX_IMAGE_BYTES + 1 }, user)).rejects.toThrow(PayloadTooLargeException);
    await expect(svc.uploadImage({ buffer: Buffer.from('not an image'), size: 12 }, user)).rejects.toThrow(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('maps storage failures to 503 without leaking details', async () => {
    const { svc, storage } = make();
    storage.upload.mockRejectedValue(new Error('secret detail'));
    await expect(svc.uploadImage({ buffer: JPEG, size: 8 }, user)).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('optimiseDeliveryUrl', () => {
  it('inserts an auto-format/quality transformation', () => {
    expect(optimiseDeliveryUrl('https://res.cloudinary.com/c/image/upload/v1/a.jpg')).toContain('/image/upload/f_auto,q_auto,w_1400,c_limit/v1/a.jpg');
  });
});

describe('shop video upload', () => {
  const folder = 'localspotter/users/u1/videos';
  const info = (over: Record<string, unknown> = {}) => ({
    publicId: `${folder}/abc123`,
    format: 'mov',
    bytes: 20 * 1024 * 1024,
    durationSeconds: 30,
    secureUrl: `https://res.cloudinary.com/demo/video/upload/v1/${folder}/abc123.mov`,
    ...over,
  });
  const make = (video: Record<string, unknown> | null, configured = true) => {
    const prisma = { mediaAsset: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'v1', ...data })) } };
    const videos = {
      isConfigured: () => configured,
      createUploadTicket: jest.fn((f: string) => ({ uploadUrl: 'https://upload', apiKey: 'k', timestamp: '1', folder: f, allowedFormats: 'mp4,mov,webm', signature: 's' })),
      getVideo: jest.fn().mockResolvedValue(video),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    return { svc: new MediaService(prisma as any, {} as any, videos as any), prisma, videos };
  };

  it('issues an upload ticket restricted to the caller\'s own folder, with the limits', () => {
    const { svc, videos } = make(null);
    const t = svc.createVideoUploadTicket(user);
    expect(videos.createUploadTicket).toHaveBeenCalledWith(folder);
    expect(t).toMatchObject({ folder, maxBytes: 50 * 1024 * 1024, maxSeconds: 120 });
    expect(() => make(null, false).svc.createVideoUploadTicket(user)).toThrow(ServiceUnavailableException);
  });

  it('registers a valid video as an MP4 delivery URL', async () => {
    const { svc, prisma } = make(info());
    const out = await svc.registerVideo(`${folder}/abc123`, user);
    expect(out.url).toBe(`https://res.cloudinary.com/demo/video/upload/f_mp4,vc_h264,q_auto/v1/${folder}/abc123.mp4`);
    expect(prisma.mediaAsset.create.mock.calls[0][0].data).toMatchObject({ mimeType: 'video/mp4', fileSize: 20 * 1024 * 1024 });
  });

  it('rejects a public id outside the caller\'s folder or with path tricks, without calling storage', async () => {
    const { svc, videos } = make(info());
    await expect(svc.registerVideo('localspotter/users/u2/videos/abc123', user)).rejects.toThrow(BadRequestException);
    await expect(svc.registerVideo(`${folder}/../../u2/x`, user)).rejects.toThrow(BadRequestException);
    expect(videos.getVideo).not.toHaveBeenCalled();
  });

  it('rejects and deletes a video that is too big, too long or the wrong format', async () => {
    for (const [over, err] of [
      [{ bytes: 60 * 1024 * 1024 }, PayloadTooLargeException],
      [{ durationSeconds: 300 }, PayloadTooLargeException],
      [{ format: 'avi' }, BadRequestException],
    ] as const) {
      const { svc, videos, prisma } = make(info(over));
      await expect(svc.registerVideo(`${folder}/abc123`, user)).rejects.toThrow(err);
      expect(videos.destroy).toHaveBeenCalledWith(`${folder}/abc123`);
      expect(prisma.mediaAsset.create).not.toHaveBeenCalled();
    }
  });

  it('rejects an unknown upload', async () => {
    await expect(make(null).svc.registerVideo(`${folder}/nope`, user)).rejects.toThrow(BadRequestException);
  });

  it('builds a browser-friendly delivery URL', () => {
    expect(videoDeliveryUrl('https://res.cloudinary.com/x/video/upload/v1/a/b.webm')).toBe('https://res.cloudinary.com/x/video/upload/f_mp4,vc_h264,q_auto/v1/a/b.mp4');
  });
});
