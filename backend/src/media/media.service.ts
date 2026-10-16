import { BadRequestException, Inject, Injectable, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';
import { IMAGE_STORAGE, ImageStorage } from './image-storage';
import { MAX_IMAGE_BYTES, detectImageType } from './image-validation';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
  ) {}

  async uploadImage(file: { buffer: Buffer; size: number } | undefined, user: AuthUser) {
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException('Afbeeldingen uploaden is tijdelijk niet beschikbaar');
    }
    if (!file || !file.buffer?.length) throw new BadRequestException('Geen bestand ontvangen');
    if (file.size > MAX_IMAGE_BYTES) throw new PayloadTooLargeException('Afbeelding is groter dan 10 MB');

    const detected = detectImageType(file.buffer);
    if (!detected) throw new BadRequestException('Dit bestand is geen ondersteunde afbeelding (JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP of TIFF)');

    let stored;
    try {
      // Controlled storage path: never derived from the client's filename.
      stored = await this.storage.upload(file.buffer, detected.mime, `localspotter/users/${user.id}`);
    } catch {
      throw new ServiceUnavailableException('Uploaden is mislukt, probeer het later opnieuw');
    }

    const asset = await this.prisma.mediaAsset.create({
      data: { url: stored.url, mimeType: detected.mime, fileSize: stored.bytes },
    });
    return { id: asset.id, url: asset.url };
  }
}
