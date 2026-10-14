import { BadRequestException, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MediaService } from './media.service';
import { detectImageType, MAX_IMAGE_BYTES } from './image-validation';
import { optimiseDeliveryUrl } from './image-storage';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const user = { id: 'u1', role: UserRole.BUSINESS_OWNER } as any;

describe('detectImageType', () => {
  it('detects jpeg/png/webp by magic bytes and rejects everything else', () => {
    expect(detectImageType(JPEG)?.mime).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBP', 'ascii'))?.mime).toBe('image/webp');
    expect(detectImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
  });
});

describe('MediaService.uploadImage', () => {
  const make = (configured = true) => {
    const prisma = { mediaAsset: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'm1', ...data })) } };
    const storage = { isConfigured: () => configured, upload: jest.fn().mockResolvedValue({ url: 'https://res.cloudinary.com/x/image/upload/a.jpg', bytes: 8 }) };
    return { svc: new MediaService(prisma as any, storage as any), prisma, storage };
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
