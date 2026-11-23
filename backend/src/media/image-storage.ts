import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export interface StoredImage {
  url: string;
  bytes: number;
  /** Set for Supabase Storage objects. */
  bucket?: string;
  path?: string;
}

export interface ImageStorage {
  isConfigured(): boolean;
  upload(file: Buffer, mimeType: string, folder: string): Promise<StoredImage>;
}

export class UnconfiguredImageStorage implements ImageStorage {
  isConfigured(): boolean {
    return false;
  }
  async upload(): Promise<StoredImage> {
    throw new Error('Image storage is not configured');
  }
}

/** Signed server-side upload to Cloudinary. The API secret never leaves the backend. */
export class CloudinaryImageStorage implements ImageStorage {
  private readonly logger = new Logger(CloudinaryImageStorage.name);

  constructor(private readonly opts: { cloudName: string; apiKey: string; apiSecret: string; timeoutMs?: number }) {}

  isConfigured(): boolean {
    return true;
  }

  async upload(file: Buffer, mimeType: string, folder: string): Promise<StoredImage> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Signature = sha1 of the signed params sorted alphabetically, + api secret.
    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHash('sha1').update(toSign + this.opts.apiSecret).digest('hex');

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), 'upload');
    form.append('api_key', this.opts.apiKey);
    form.append('timestamp', timestamp);
    form.append('folder', folder);
    form.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.opts.cloudName)}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 20000),
    });
    if (!res.ok) {
      this.logger.warn(`Cloudinary upload failed with status ${res.status}`);
      throw new Error(`Cloudinary responded ${res.status}`);
    }
    const body = (await res.json()) as { secure_url?: string; bytes?: number };
    if (!body.secure_url) throw new Error('Cloudinary response had no secure_url');
    return { url: optimiseDeliveryUrl(body.secure_url), bytes: body.bytes ?? file.length };
  }
}

/** Serve a resized, auto-format/quality version (smaller downloads, same stored original). */
export function optimiseDeliveryUrl(url: string): string {
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_1400,c_limit/');
}

/**
 * Server-side image uploads into Supabase Storage (STORAGE_PROVIDER=supabase) for the paths that still upload
 * through the API (small, browser-resized images: avatars, workshop and route covers, chat). Chat images go to the
 * private chat-attachments bucket (read through short-lived signed URLs); everything else to public shop-media.
 * Supabase does not convert formats, so only web formats are accepted.
 */
export class SupabaseImageStorage implements ImageStorage {
  constructor(private readonly client: import('./supabase-storage').SupabaseStorageClient) {}

  isConfigured(): boolean {
    return true;
  }

  async upload(file: Buffer, mimeType: string, folder: string): Promise<StoredImage> {
    const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' } as Record<string, string>)[mimeType];
    if (!ext) throw new UnsupportedImageFormatError();
    const name = `${createHash('sha256').update(file).digest('hex').slice(0, 16)}-${Date.now().toString(36)}.${ext}`;
    const rest = folder.replace(/^localspotter\//, '');
    const chat = /^chat\/([0-9a-f-]{36})$/i.exec(rest);
    const bucket = chat ? 'chat-attachments' : 'shop-media';
    const path = chat ? `conversations/${chat[1]}/${name}` : `${rest}/${name}`;
    await this.client.upload(bucket, path, file, mimeType);
    return { url: chat ? '' : this.client.publicUrl(bucket, path), bytes: file.length, bucket, path };
  }
}

export class UnsupportedImageFormatError extends Error {
  constructor() {
    super('Use JPEG, PNG, WebP, GIF or AVIF');
  }
}
