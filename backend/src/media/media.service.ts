import { BadRequestException, Inject, Injectable, Logger, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';
import { IMAGE_STORAGE, ImageStorage } from './image-storage';
import { MAX_CONTENT_IMAGE_BYTES, detectImageType } from './image-validation';
import {
  ALLOWED_VIDEO_FORMATS,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  VIDEO_STORAGE,
  VideoStorage,
  videoDeliveryUrl,
} from './video-storage';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
    @Inject(VIDEO_STORAGE) private readonly videos: VideoStorage,
  ) {}

  private videoFolder(user: AuthUser): string {
    return `localspotter/users/${user.id}/videos`;
  }

  /** Step 1 of a shop-video upload: a signed ticket that lets the browser upload one video directly to storage. */
  createVideoUploadTicket(user: AuthUser) {
    if (!this.videos.isConfigured()) throw new ServiceUnavailableException('Video uploaden is tijdelijk niet beschikbaar');
    return {
      ...this.videos.createUploadTicket(this.videoFolder(user)),
      maxBytes: MAX_VIDEO_BYTES,
      maxSeconds: MAX_VIDEO_SECONDS,
    };
  }

  /**
   * Step 2: after the browser finished uploading, register the video. Everything is re-read from the
   * storage provider (the browser's report is never trusted): it must live in this user's own folder,
   * be an allowed format, and stay within the size and duration limits, otherwise it is deleted again.
   */
  async registerVideo(publicId: string, user: AuthUser) {
    if (!this.videos.isConfigured()) throw new ServiceUnavailableException('Video uploaden is tijdelijk niet beschikbaar');
    const folder = this.videoFolder(user);
    if (!publicId.startsWith(`${folder}/`) || !/^[A-Za-z0-9_\-\/]+$/.test(publicId) || publicId.includes('..')) {
      throw new BadRequestException('Ongeldige video');
    }
    let info;
    try {
      info = await this.videos.getVideo(publicId);
    } catch {
      throw new ServiceUnavailableException('Video controleren is mislukt, probeer het later opnieuw');
    }
    if (!info) throw new BadRequestException('Video niet gevonden, upload de video opnieuw');

    let problem: BadRequestException | PayloadTooLargeException | null = null;
    if (!(ALLOWED_VIDEO_FORMATS as readonly string[]).includes(info.format)) {
      problem = new BadRequestException('Dit bestand is geen ondersteunde video (MP4, MOV of WebM)');
    } else if (info.bytes > MAX_VIDEO_BYTES) {
      problem = new PayloadTooLargeException(`Video is groter dan ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))} MB`);
    } else if (info.durationSeconds > MAX_VIDEO_SECONDS) {
      problem = new PayloadTooLargeException(`Video is langer dan ${MAX_VIDEO_SECONDS} seconden`);
    }
    if (problem) {
      await this.videos.destroy(info.publicId).catch(() => this.logger.warn('Could not delete a rejected video'));
      throw problem;
    }

    const asset = await this.prisma.mediaAsset.create({
      data: { url: videoDeliveryUrl(info.secureUrl), mimeType: 'video/mp4', fileSize: info.bytes },
    });
    return { id: asset.id, url: asset.url };
  }

  async uploadImage(
    file: { buffer: Buffer; size: number } | undefined,
    user: AuthUser,
    options: { maxBytes?: number; folder?: string } = {},
  ) {
    const maxBytes = options.maxBytes ?? MAX_CONTENT_IMAGE_BYTES;
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException('Afbeeldingen uploaden is tijdelijk niet beschikbaar');
    }
    if (!file || !file.buffer?.length) throw new BadRequestException('Geen bestand ontvangen');
    if (file.size > maxBytes) throw new PayloadTooLargeException(`Afbeelding is groter dan ${Math.round(maxBytes / (1024 * 1024))} MB`);

    const detected = detectImageType(file.buffer);
    if (!detected) throw new BadRequestException('Dit bestand is geen ondersteunde afbeelding (JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP of TIFF)');

    let stored;
    try {
      // Controlled storage path: never derived from the client's filename.
      stored = await this.storage.upload(file.buffer, detected.mime, options.folder ?? `localspotter/users/${user.id}`);
    } catch {
      throw new ServiceUnavailableException('Uploaden is mislukt, probeer het later opnieuw');
    }

    const asset = await this.prisma.mediaAsset.create({
      data: { url: stored.url, mimeType: detected.mime, fileSize: stored.bytes },
    });
    return { id: asset.id, url: asset.url };
  }
}
