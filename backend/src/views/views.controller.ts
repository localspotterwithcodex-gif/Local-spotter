import { BadRequestException, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { VIEW_KINDS, ViewKind, ViewsService } from './views.service';

@ApiTags('views')
@Controller('views')
export class ViewsController {
  constructor(private readonly views: ViewsService) {}

  @UseGuards(OptionalJwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 120, windowMs: 15 * 60 * 1000 })
  @Post(':kind/:id')
  @ApiOperation({ summary: 'Record one view of a public shop, shop route or workshop page' })
  async record(@Param('kind') kind: string, @Param('id') id: string, @Req() req: any) {
    if (!VIEW_KINDS.includes(kind as ViewKind)) throw new BadRequestException('Unknown kind');
    return this.views.record(kind as ViewKind, id, { userId: req?.user?.id, ip: req?.ip });
  }
}
