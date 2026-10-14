import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export interface StoredImage {
  url: string;
  bytes: number;
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
