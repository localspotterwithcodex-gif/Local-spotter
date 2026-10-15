import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { MediaService } from './media.service';
import { MAX_IMAGE_BYTES } from './image-validation';

/** The subset of multer's file object we use (memory storage). */
type UploadedImage = { buffer: Buffer; size: number };

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 40, windowMs: 10 * 60 * 1000 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload one image (JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP or TIFF, max 10 MB). Returns the MediaAsset id and URL.' })
  upload(@UploadedFile() file: UploadedImage | undefined, @CurrentUser() user: AuthUser) {
    return this.media.uploadImage(file, user);
  }
}
