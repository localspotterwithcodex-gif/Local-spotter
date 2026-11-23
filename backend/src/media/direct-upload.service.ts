import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MediaKind, MediaPurpose, MediaStatus, ReviewStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';
import { EmployeesService } from '../employees/employees.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { detectImageType } from './image-validation';
import { IMAGE_TYPES, PURPOSE_RULES, VIDEO_TYPES, detectMp4, mp4DurationSeconds, storagePath } from './storage-layout';
import { StorageRequestError, SupabaseStorageClient } from './supabase-storage';

export const SUPABASE_STORAGE = Symbol('SUPABASE_STORAGE');

export interface UploadTicketRequest {
  purpose: MediaPurpose;
  contentType: string;
  size: number;
  businessId?: string;
  productId?: string;
  reviewId?: string;
  conversationId?: string;
}

/**
 * Browser -> Supabase Storage uploads (MASTER-PROMPT Phase 4): the API issues a signed upload URL for one object at
 * a fixed path after checking who may upload what, then confirms the object by reading it back from storage.
 * Large files never pass through a Vercel function.
 */
@Injectable()
export class DirectUploadService {
  private readonly logger = new Logger(DirectUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUPABASE_STORAGE) private readonly storage: SupabaseStorageClient | null,
    private readonly employees: EmployeesService,
    private readonly entitlements: SubscriptionEntitlementService,
  ) {}

  isEnabled(): boolean {
    return !!this.storage;
  }

  private client(): SupabaseStorageClient {
    if (!this.storage) throw new ConflictException({ code: 'DIRECT_UPLOAD_DISABLED', message: 'Direct uploads are off (STORAGE_PROVIDER is not supabase)' });
    return this.storage;
  }

  async createTicket(user: AuthUser, req: UploadTicketRequest) {
    const storage = this.client();
    const rule = PURPOSE_RULES[req.purpose];
    const ext = (rule.kind === MediaKind.IMAGE ? IMAGE_TYPES : VIDEO_TYPES)[req.contentType];
    if (!ext) {
      throw new BadRequestException({ code: 'UNSUPPORTED_TYPE', message: rule.kind === MediaKind.IMAGE ? 'Alleen JPEG, PNG, WebP, GIF of AVIF' : 'Alleen MP4-video' });
    }
    if (req.size > rule.maxBytes) throw new PayloadTooLargeException(`Bestand is groter dan ${Math.round(rule.maxBytes / (1024 * 1024))} MB`);

    const ids = { ...req };
    let consumerProfileId: string | null = null;
    switch (req.purpose) {
      case MediaPurpose.SHOP_ICON:
      case MediaPurpose.SHOP_COVER:
      case MediaPurpose.SHOP_PANORAMA:
      case MediaPurpose.SHOP_VIDEO:
      case MediaPurpose.PRODUCT_IMAGE: {
        if (!req.businessId) throw new BadRequestException('businessId is verplicht');
        if (!(await this.employees.canAccessShop(user, req.businessId))) throw new ForbiddenException('Je bent niet gemachtigd voor deze winkel');
        if (req.purpose === MediaPurpose.SHOP_VIDEO) {
          await this.entitlements.assertFeature(req.businessId, 'SHOP_VIDEO', 'Een winkelvideo zit niet in je abonnement');
        }
        if (req.purpose === MediaPurpose.PRODUCT_IMAGE && req.productId) {
          const product = await this.prisma.product.findUnique({ where: { id: req.productId }, select: { businessId: true, deletedAt: true } });
          if (!product || product.deletedAt || product.businessId !== req.businessId) throw new NotFoundException('Product niet gevonden');
          const count = await this.prisma.productImage.count({ where: { productId: req.productId } });
          await this.entitlements.assertWithinLimit(req.businessId, 'maxProductImages', count + 1, 'Maximaal aantal afbeeldingen voor dit product bereikt in je abonnement');
        }
        break;
      }
      case MediaPurpose.REVIEW_PHOTO:
      case MediaPurpose.REVIEW_VIDEO: {
        if (!req.reviewId) throw new BadRequestException('reviewId is verplicht');
        const review = await this.prisma.review.findUnique({ where: { id: req.reviewId }, select: { consumerProfileId: true, businessId: true, status: true, deletedAt: true } });
        // Only the author, while the review waits for its media (it is published once every file is confirmed).
        if (!review || review.deletedAt || user.role !== UserRole.CONSUMER || review.consumerProfileId !== user.profileId) throw new NotFoundException('Review niet gevonden');
        if (review.status !== ReviewStatus.PENDING) throw new ConflictException('Foto’s en video’s kunnen alleen bij een nieuwe review');
        ids.businessId = review.businessId;
        consumerProfileId = review.consumerProfileId;
        const count = await this.prisma.mediaAsset.count({
          where: { purpose: req.purpose, status: { in: [MediaStatus.PENDING, MediaStatus.READY] }, storagePath: { startsWith: `shops/${review.businessId}/reviews/${req.reviewId}/` } },
        });
        const limit = req.purpose === MediaPurpose.REVIEW_PHOTO ? 'maxReviewPhotos' : 'maxReviewVideos';
        await this.entitlements.assertWithinLimit(review.businessId, limit, count + 1, 'Deze winkel staat (meer) foto’s of video’s bij reviews niet toe');
        break;
      }
      case MediaPurpose.CHAT_ATTACHMENT: {
        if (!req.conversationId) throw new BadRequestException('conversationId is verplicht');
        const conv = await this.prisma.conversation.findUnique({ where: { id: req.conversationId }, select: { consumerProfileId: true, businessId: true } });
        const participant =
          !!conv && ((user.role === UserRole.CONSUMER && conv.consumerProfileId === user.profileId) || (await this.employees.canAccessShop(user, conv.businessId)));
        if (!participant) throw new NotFoundException('Gesprek niet gevonden');
        break;
      }
    }

    const path = storagePath(req.purpose, ids, randomUUID(), ext);
    let signed: { signedUrl: string };
    try {
      signed = await storage.signUpload(rule.bucket, path);
    } catch {
      throw new ServiceUnavailableException('Uploaden is tijdelijk niet beschikbaar');
    }
    const isPublic = rule.bucket !== 'chat-attachments';
    const asset = await this.prisma.mediaAsset.create({
      data: {
        url: isPublic ? storage.publicUrl(rule.bucket, path) : '',
        mimeType: req.contentType,
        fileSize: req.size,
        bucket: rule.bucket,
        storagePath: path,
        kind: rule.kind,
        purpose: req.purpose,
        status: MediaStatus.PENDING,
        uploadedByUserId: user.id,
        businessId: req.purpose === MediaPurpose.CHAT_ATTACHMENT ? null : ids.businessId ?? null,
        consumerProfileId,
      },
    });
    return { assetId: asset.id, uploadUrl: signed.signedUrl, contentType: req.contentType, maxBytes: rule.maxBytes };
  }

  /** After the browser's PUT: re-reads the object from storage (size, real type, video length) and marks it READY. */
  async confirm(user: AuthUser, assetId: string) {
    const storage = this.client();
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.uploadedByUserId !== user.id || !asset.bucket || !asset.storagePath || !asset.purpose) throw new NotFoundException('Bestand niet gevonden');
    if (asset.status === MediaStatus.READY) return { id: asset.id, url: asset.url };
    if (asset.status !== MediaStatus.PENDING) throw new ConflictException('Dit bestand is afgewezen; upload het opnieuw');
    const rule = PURPOSE_RULES[asset.purpose];
    const bucket = asset.bucket;
    const path = asset.storagePath;

    const reject = async (err: Error): Promise<never> => {
      await storage.remove(bucket, [path]).catch(() => this.logger.warn('Could not delete a rejected upload'));
      await this.prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: MediaStatus.REJECTED } });
      throw err;
    };

    let info: { size: number } | null;
    let head: Buffer;
    try {
      info = await storage.info(bucket, path);
      head = info ? await storage.readRange(bucket, path, 0, 64) : Buffer.alloc(0);
    } catch (e) {
      if (e instanceof StorageRequestError) throw new ServiceUnavailableException('Controleren is mislukt, probeer het opnieuw');
      throw e;
    }
    if (!info) throw new BadRequestException('Bestand niet gevonden in de opslag; upload het opnieuw');
    if (info.size > rule.maxBytes) return reject(new PayloadTooLargeException(`Bestand is groter dan ${Math.round(rule.maxBytes / (1024 * 1024))} MB`));

    let durationSeconds: number | null = null;
    if (rule.kind === MediaKind.IMAGE) {
      // The real type must be the declared one (the path's extension was chosen from it).
      if (detectImageType(head)?.mime !== asset.mimeType) return reject(new BadRequestException('Dit bestand is geen ondersteunde afbeelding'));
    } else {
      if (!detectMp4(head)) return reject(new BadRequestException('Alleen MP4-video'));
      durationSeconds = await mp4DurationSeconds((s, l) => storage.readRange(bucket, path, s, l), info.size).catch(() => null);
      if (durationSeconds === null) return reject(new BadRequestException('De lengte van de video kon niet worden gelezen'));
      if (rule.maxSeconds && durationSeconds > rule.maxSeconds) return reject(new PayloadTooLargeException(`Video is langer dan ${rule.maxSeconds} seconden`));
    }

    await this.prisma.mediaAsset.updateMany({
      where: { id: asset.id, status: MediaStatus.PENDING },
      data: { status: MediaStatus.READY, fileSize: info.size, durationSeconds: durationSeconds === null ? null : Math.round(durationSeconds) },
    });
    return { id: asset.id, url: asset.url };
  }
}
