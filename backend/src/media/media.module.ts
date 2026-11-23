import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { EmployeesModule } from '../employees/employees.module';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CloudinaryImageStorage, IMAGE_STORAGE, ImageStorage, SupabaseImageStorage, UnconfiguredImageStorage } from './image-storage';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { DirectUploadService, SUPABASE_STORAGE } from './direct-upload.service';
import { SupabaseStorageClient } from './supabase-storage';
import { CloudinaryVideoStorage, UnconfiguredVideoStorage, VIDEO_STORAGE, VideoStorage } from './video-storage';

/** STORAGE_PROVIDER=supabase switches uploads to Supabase Storage; otherwise Cloudinary (until staging is verified). */
const supabaseClient = (config: ConfigService): SupabaseStorageClient | null =>
  config.get<string>('STORAGE_PROVIDER') === 'supabase'
    ? new SupabaseStorageClient({ url: config.getOrThrow<string>('SUPABASE_URL'), serviceKey: config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY') })
    : null;

const cloudinary = (config: ConfigService) => {
  const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
  const apiKey = config.get<string>('CLOUDINARY_API_KEY');
  const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
};

@Module({
  imports: [EmployeesModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    DirectUploadService,
    SubscriptionEntitlementService,
    RateLimitGuard,
    { provide: SUPABASE_STORAGE, inject: [ConfigService], useFactory: supabaseClient },
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService, SUPABASE_STORAGE],
      useFactory: (config: ConfigService, supabase: SupabaseStorageClient | null): ImageStorage => {
        if (supabase) return new SupabaseImageStorage(supabase);
        const c = cloudinary(config);
        return c ? new CloudinaryImageStorage(c) : new UnconfiguredImageStorage();
      },
    },
    {
      provide: VIDEO_STORAGE,
      inject: [ConfigService],
      // Shop video keeps Cloudinary (it converts to MP4) until the owner decides; with Supabase only, video goes
      // through the direct MP4 upload (POST /media/upload-ticket, purpose SHOP_VIDEO).
      useFactory: (config: ConfigService): VideoStorage => {
        const c = cloudinary(config);
        return c ? new CloudinaryVideoStorage(c) : new UnconfiguredVideoStorage();
      },
    },
  ],
  exports: [MediaService, DirectUploadService, SUPABASE_STORAGE],
})
export class MediaModule {}
