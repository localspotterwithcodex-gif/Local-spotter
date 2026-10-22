import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';

export const VIDEO_STORAGE = Symbol('VIDEO_STORAGE');

/** Shop video limits (enforced server-side after the browser has uploaded straight to storage). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 120;
export const ALLOWED_VIDEO_FORMATS = ['mp4', 'mov', 'webm'] as const;

export interface VideoUploadTicket {
  uploadUrl: string;
  apiKey: string;
  timestamp: string;
  folder: string;
  allowedFormats: string;
  signature: string;
}

export interface StoredVideoInfo {
  publicId: string;
  format: string;
  bytes: number;
  durationSeconds: number;
  secureUrl: string;
}

export interface VideoStorage {
  isConfigured(): boolean;
  /** Signed, restricted ticket so the browser can upload one video directly (no API secret leaves the server). */
  createUploadTicket(folder: string): VideoUploadTicket;
  /** Authoritative metadata read from the storage provider (never from the browser). null = not found. */
  getVideo(publicId: string): Promise<StoredVideoInfo | null>;
  destroy(publicId: string): Promise<void>;
}

export class UnconfiguredVideoStorage implements VideoStorage {
  isConfigured(): boolean {
    return false;
  }
  createUploadTicket(): VideoUploadTicket {
    throw new Error('Video storage is not configured');
  }
  async getVideo(): Promise<StoredVideoInfo | null> {
    throw new Error('Video storage is not configured');
  }
  async destroy(): Promise<void> {
    throw new Error('Video storage is not configured');
  }
}

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

export class CloudinaryVideoStorage implements VideoStorage {
  private readonly logger = new Logger(CloudinaryVideoStorage.name);

  constructor(private readonly opts: { cloudName: string; apiKey: string; apiSecret: string; timeoutMs?: number }) {}

  isConfigured(): boolean {
    return true;
  }

  createUploadTicket(folder: string): VideoUploadTicket {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const allowedFormats = ALLOWED_VIDEO_FORMATS.join(',');
    // Signature = sha1 of the signed params sorted alphabetically, + api secret.
    const signature = sha1(`allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${this.opts.apiSecret}`);
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.opts.cloudName)}/video/upload`,
      apiKey: this.opts.apiKey,
      timestamp,
      folder,
      allowedFormats,
      signature,
    };
  }

  async getVideo(publicId: string): Promise<StoredVideoInfo | null> {
    const auth = Buffer.from(`${this.opts.apiKey}:${this.opts.apiSecret}`).toString('base64');
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.opts.cloudName)}/resources/video/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(this.opts.timeoutMs ?? 15000) },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      this.logger.warn(`Cloudinary video lookup failed with status ${res.status}`);
      throw new Error(`Cloudinary responded ${res.status}`);
    }
    const body = (await res.json()) as { public_id?: string; format?: string; bytes?: number; duration?: number; secure_url?: string };
    if (!body.public_id || !body.secure_url) return null;
    return {
      publicId: body.public_id,
      format: String(body.format ?? '').toLowerCase(),
      bytes: Number(body.bytes ?? 0),
      durationSeconds: Number(body.duration ?? 0),
      secureUrl: body.secure_url,
    };
  }

  async destroy(publicId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const form = new URLSearchParams({
      public_id: publicId,
      timestamp,
      api_key: this.opts.apiKey,
      signature: sha1(`public_id=${publicId}&timestamp=${timestamp}${this.opts.apiSecret}`),
    });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.opts.cloudName)}/video/destroy`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 15000),
    });
    if (!res.ok) this.logger.warn(`Cloudinary video delete failed with status ${res.status}`);
  }
}

/** Streams a browser-friendly H.264 MP4 whatever the uploaded container was (MOV, WebM, ...). */
export function videoDeliveryUrl(secureUrl: string): string {
  return secureUrl.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,q_auto/').replace(/\.[A-Za-z0-9]{2,5}$/, '.mp4');
}
