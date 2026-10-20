import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { SESSION_COOKIE } from '../auth/utils/session-cookie';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user';
import { DeleteAccountDto } from './dto/privacy.dto';
import { PrivacyService } from './privacy.service';

@ApiTags('Privacy')
@Controller('account')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CONSUMER, UserRole.BUSINESS_OWNER)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('export')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @Header('Cache-Control', 'no-store')
  @Header('Content-Disposition', 'attachment; filename="localspotter-mijn-gegevens.json"')
  @ApiOperation({ summary: 'Download all personal data of the logged-in user (JSON)' })
  export(@CurrentUser() user: AuthUser) {
    return this.privacy.exportMyData(user);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Delete (anonymise) my account. Requires typing DELETE and the password.' })
  async remove(@Body() dto: DeleteAccountDto, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.privacy.deleteMyAccount(user, dto.confirm, dto.password);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return result;
  }
}
