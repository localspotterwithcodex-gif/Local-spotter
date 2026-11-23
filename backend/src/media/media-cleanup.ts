import { Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { SUPABASE_STORAGE } from './direct-upload.service';
import { SupabaseStorageClient } from './supabase-storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 200;

/**
 * Supabase objects nothing uses any more: no profile, product, review, workshop or chat message points at them,
 * and every shop/product/review that does is deleted. Covers replaced shop icons, removed product photos,
 * deleted reviews and shops, and chat attachments removed by the retention job.
 */
export const ORPHAN_WHERE: Prisma.MediaAssetWhereInput = {
  consumerProfiles: { none: {} },
  businessOwnerProfiles: { none: {} },
  businessLogos: { every: { deletedAt: { not: null } } },
  businessCovers: { every: { deletedAt: { not: null } } },
  businessPanoramas: { every: { deletedAt: { not: null } } },
  businessVideos: { every: { deletedAt: { not: null } } },
  productImages: { every: { product: { deletedAt: { not: null } } } },
  reviewImages: { every: { review: { deletedAt: { not: null } } } },
  workshops: { none: {} },
  chatAttachments: { none: {} },
};

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUPABASE_STORAGE) private readonly storage: SupabaseStorageClient | null,
  ) {}

  /** Daily: uploads never confirmed within 24 h, and objects nothing uses for 24 h. Idempotent; 200 per run. */
  async run() {
    if (!this.storage) return { skipped: 'STORAGE_PROVIDER is not supabase', pendingRemoved: 0, orphansRemoved: 0 };
    const cutoff = new Date(Date.now() - DAY_MS);
    const stored = { bucket: { not: null }, storagePath: { not: null }, createdAt: { lt: cutoff } } satisfies Prisma.MediaAssetWhereInput;
    const pending = await this.prisma.mediaAsset.findMany({ where: { ...stored, status: MediaStatus.PENDING }, take: BATCH, select: { id: true, bucket: true, storagePath: true } });
    const orphans = await this.prisma.mediaAsset.findMany({ where: { ...stored, status: MediaStatus.READY, ...ORPHAN_WHERE }, take: BATCH, select: { id: true, bucket: true, storagePath: true } });
    return { pendingRemoved: await this.remove(pending), orphansRemoved: await this.remove(orphans) };
  }

  private async remove(assets: { id: string; bucket: string | null; storagePath: string | null }[]): Promise<number> {
    const byBucket = new Map<string, typeof assets>();
    for (const a of assets) byBucket.set(a.bucket!, [...(byBucket.get(a.bucket!) ?? []), a]);
    let removed = 0;
    for (const [bucket, list] of byBucket) {
      try {
        await this.storage!.remove(bucket, list.map((a) => a.storagePath!));
      } catch {
        this.logger.warn(`Could not remove ${list.length} object(s) from ${bucket}; retried next run`);
        continue;
      }
      // Only rows still in the state we saw (a concurrent confirm or new reference wins).
      const { count } = await this.prisma.mediaAsset.updateMany({ where: { id: { in: list.map((a) => a.id) } }, data: { status: MediaStatus.DELETED } });
      removed += count;
    }
    return removed;
  }
}

@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class MediaJobsController {
  constructor(private readonly cleanup: MediaCleanupService) {}

  /** Vercel Cron calls GET (with Authorization: Bearer CRON_SECRET); same job as the POST below. */
  @Get('media-cleanup')
  cron() {
    return this.run();
  }

  @Post('media-cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove unconfirmed uploads and unused files from Supabase Storage (daily)' })
  run() {
    return this.cleanup.run();
  }
}
