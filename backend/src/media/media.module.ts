import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryImageStorage, IMAGE_STORAGE, ImageStorage, UnconfiguredImageStorage } from './image-storage';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    PrismaService,
    RateLimitGuard,
    {
      provide: IMAGE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ImageStorage => {
        const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = config.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
        return cloudName && apiKey && apiSecret
          ? new CloudinaryImageStorage({ cloudName, apiKey, apiSecret })
          : new UnconfiguredImageStorage();
      },
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
