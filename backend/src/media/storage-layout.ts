import { MediaKind, MediaPurpose } from '@prisma/client';
import { BucketSpec } from './supabase-storage';
import { MAX_CHAT_ATTACHMENT_BYTES, MAX_CONTENT_IMAGE_BYTES } from './image-validation';
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from './video-storage';

/** Raster images only (SVG can carry scripts). Videos: MP4 only, because Supabase cannot transcode (4.x). */
export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
export const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4' };
/** D4: review video at most 30 s and 20 MB. */
export const MAX_REVIEW_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_REVIEW_VIDEO_SECONDS = 30;

/** Buckets (MASTER-PROMPT Phase 4), created by scripts/storage-buckets.ts, never by hand. */
export const BUCKETS: BucketSpec[] = [
  { id: 'shop-media', public: true, fileSizeLimit: MAX_VIDEO_BYTES, allowedMimeTypes: [...Object.keys(IMAGE_TYPES), ...Object.keys(VIDEO_TYPES)] },
  { id: 'product-images', public: true, fileSizeLimit: MAX_CONTENT_IMAGE_BYTES, allowedMimeTypes: Object.keys(IMAGE_TYPES) },
  { id: 'review-media', public: true, fileSizeLimit: MAX_REVIEW_VIDEO_BYTES, allowedMimeTypes: [...Object.keys(IMAGE_TYPES), ...Object.keys(VIDEO_TYPES)] },
  { id: 'chat-attachments', public: false, fileSizeLimit: MAX_CHAT_ATTACHMENT_BYTES, allowedMimeTypes: Object.keys(IMAGE_TYPES) },
];

export interface PurposeRule {
  bucket: string;
  kind: MediaKind;
  maxBytes: number;
  maxSeconds?: number;
}

export const PURPOSE_RULES: Record<MediaPurpose, PurposeRule> = {
  SHOP_ICON: { bucket: 'shop-media', kind: MediaKind.IMAGE, maxBytes: MAX_CONTENT_IMAGE_BYTES },
  SHOP_COVER: { bucket: 'shop-media', kind: MediaKind.IMAGE, maxBytes: MAX_CONTENT_IMAGE_BYTES },
  SHOP_PANORAMA: { bucket: 'shop-media', kind: MediaKind.IMAGE, maxBytes: MAX_CONTENT_IMAGE_BYTES },
  SHOP_VIDEO: { bucket: 'shop-media', kind: MediaKind.VIDEO, maxBytes: MAX_VIDEO_BYTES, maxSeconds: MAX_VIDEO_SECONDS },
  PRODUCT_IMAGE: { bucket: 'product-images', kind: MediaKind.IMAGE, maxBytes: MAX_CONTENT_IMAGE_BYTES },
  REVIEW_PHOTO: { bucket: 'review-media', kind: MediaKind.IMAGE, maxBytes: MAX_CONTENT_IMAGE_BYTES },
  REVIEW_VIDEO: { bucket: 'review-media', kind: MediaKind.VIDEO, maxBytes: MAX_REVIEW_VIDEO_BYTES, maxSeconds: MAX_REVIEW_VIDEO_SECONDS },
  CHAT_ATTACHMENT: { bucket: 'chat-attachments', kind: MediaKind.IMAGE, maxBytes: MAX_CHAT_ATTACHMENT_BYTES },
};

export interface PathIds {
  businessId?: string;
  productId?: string;
  reviewId?: string;
  conversationId?: string;
}

/** Object path inside the purpose's bucket. Shop icons and review media always live in different folders. */
export function storagePath(purpose: MediaPurpose, ids: PathIds, fileId: string, ext: string): string {
  const shop = `shops/${ids.businessId}`;
  switch (purpose) {
    case MediaPurpose.SHOP_ICON:
      return `${shop}/icon/${fileId}.${ext}`;
    case MediaPurpose.SHOP_COVER:
      return `${shop}/cover/${fileId}.${ext}`;
    case MediaPurpose.SHOP_PANORAMA:
      return `${shop}/panorama/${fileId}.${ext}`;
    case MediaPurpose.SHOP_VIDEO:
      return `${shop}/video/${fileId}.${ext}`;
    case MediaPurpose.PRODUCT_IMAGE:
      // A new product has no id yet: its images wait in "unassigned" until the product is saved.
      return `${shop}/products/${ids.productId ?? 'unassigned'}/${fileId}.${ext}`;
    case MediaPurpose.REVIEW_PHOTO:
      return `${shop}/reviews/${ids.reviewId}/photos/${fileId}.${ext}`;
    case MediaPurpose.REVIEW_VIDEO:
      return `${shop}/reviews/${ids.reviewId}/videos/${fileId}.${ext}`;
    case MediaPurpose.CHAT_ATTACHMENT:
      return `conversations/${ids.conversationId}/${fileId}.${ext}`;
  }
}

/** Real video container from the first bytes: MP4 (ISO BMFF, not QuickTime) only. */
export function detectMp4(buf: Buffer): boolean {
  if (buf.length < 12 || buf.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
  const brand = buf.subarray(8, 12).toString('ascii');
  return brand !== 'qt  ' && !['avif', 'avis', 'heic', 'heix', 'mif1', 'msf1'].includes(brand);
}

type ReadAt = (start: number, length: number) => Promise<Buffer>;

/**
 * Duration in seconds from an MP4's moov/mvhd box, wherever moov is (start or end of the file), reading only box
 * headers and the moov box (max 8 MB). Returns null when it cannot be determined.
 */
export async function mp4DurationSeconds(readAt: ReadAt, fileSize: number): Promise<number | null> {
  let pos = 0;
  for (let i = 0; i < 64 && pos + 8 <= fileSize; i++) {
    const head = await readAt(pos, 16);
    if (head.length < 8) return null;
    let size = head.readUInt32BE(0);
    const type = head.subarray(4, 8).toString('ascii');
    let headerLen = 8;
    if (size === 1) {
      if (head.length < 16) return null;
      size = Number(head.readBigUInt64BE(8));
      headerLen = 16;
    } else if (size === 0) {
      size = fileSize - pos;
    }
    if (size < headerLen) return null;
    if (type === 'moov') {
      if (size > 8 * 1024 * 1024) return null;
      return parseMvhd(await readAt(pos + headerLen, size - headerLen));
    }
    pos += size;
  }
  return null;
}

function parseMvhd(moov: Buffer): number | null {
  let p = 0;
  while (p + 8 <= moov.length) {
    const size = moov.readUInt32BE(p);
    const type = moov.subarray(p + 4, p + 8).toString('ascii');
    if (size < 8) return null;
    if (type === 'mvhd') {
      const version = moov[p + 8];
      const body = p + 12;
      if (version === 1) {
        if (body + 28 > moov.length) return null;
        const timescale = moov.readUInt32BE(body + 16);
        const duration = Number(moov.readBigUInt64BE(body + 20));
        return timescale ? duration / timescale : null;
      }
      if (body + 16 > moov.length) return null;
      const timescale = moov.readUInt32BE(body + 8);
      const duration = moov.readUInt32BE(body + 12);
      return timescale ? duration / timescale : null;
    }
    p += size;
  }
  return null;
}
