import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { MAX_SEARCH_IMAGE_BYTES, VisualSearchService } from './visual-search.service';

@ApiTags('search')
@Controller('search')
export class VisualSearchController {
  constructor(private readonly visual: VisualSearchService) {}

  // The free Gemini quota is shared by every visitor, so the limit per visitor is tight.
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 12, windowMs: 10 * 60 * 1000 })
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Search by photo: returns keywords describing the product in the photo' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SEARCH_IMAGE_BYTES, files: 1 } }))
  async byImage(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('Afbeelding ontbreekt');
    return this.visual.keywordsFromImage(file.buffer);
  }
}
