import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors, Get } from '@nestjs/common';
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
import { RegisterVideoDto } from './dto/register-video.dto';
import { DirectUploadService } from './direct-upload.service';
import { ConfirmUploadDto, UploadTicketDto } from './dto/upload-ticket.dto';

/** The subset of multer's file object we use (memory storage). */
type UploadedImage = { buffer: Buffer; size: number };

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly direct: DirectUploadService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Which upload flow the browser should use (direct = Supabase signed uploads)' })
  config() {
    return { directUploads: this.direct.isEnabled() };
  }

  @Post('upload-ticket')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 60, windowMs: 10 * 60 * 1000 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 1 of a direct upload: checks rights, plan limits, type and size; returns a signed upload URL for one object' })
  uploadTicket(@Body() dto: UploadTicketDto, @CurrentUser() user: AuthUser) {
    return this.direct.createTicket(user, dto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 60, windowMs: 10 * 60 * 1000 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Step 3: re-checks the uploaded object (size, real type, video length) and marks it ready' })
  confirmUpload(@Body() dto: ConfirmUploadDto, @CurrentUser() user: AuthUser) {
    return this.direct.confirm(user, dto.assetId);
  }

  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 40, windowMs: 10 * 60 * 1000 })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload one image (JPEG, PNG, WebP, GIF, AVIF, HEIC, BMP or TIFF, max 5 MB). Returns the MediaAsset id and URL.' })
  upload(@UploadedFile() file: UploadedImage | undefined, @CurrentUser() user: AuthUser) {
    return this.media.uploadImage(file, user);
  }

  @Post('videos/ticket')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signed ticket for uploading ONE shop video (MP4/MOV/WebM) straight to storage' })
  videoTicket(@CurrentUser() user: AuthUser) {
    return this.media.createVideoUploadTicket(user);
  }

  @Post('videos')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN)
  @RateLimit({ limit: 20, windowMs: 10 * 60 * 1000 })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an uploaded video after checking it with the storage provider. Returns the MediaAsset id and URL.' })
  registerVideo(@Body() dto: RegisterVideoDto, @CurrentUser() user: AuthUser) {
    return this.media.registerVideo(dto.publicId, user);
  }
}
