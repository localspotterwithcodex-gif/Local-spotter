import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { AllowGuest } from '../common/decorators/allow-guest.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SESSION_COOKIE, sessionCookieOptions } from '../auth/utils/session-cookie';
import { GuestService } from './guest.service';
import { ClaimCompleteDto, CreateGuestDto, GuestOrderLinkDto, GuestSessionDto } from './dto/guest.dto';

@ApiTags('Guest checkout')
@Controller('auth/guest')
export class GuestController {
  constructor(
    private readonly guest: GuestService,
    private readonly config: ConfigService,
  ) {}

  private startSession(res: Response, accessToken: string): void {
    const secure = this.config.get<string>('NODE_ENV') === 'production' || this.config.get<string>('COOKIE_SECURE') === 'true';
    // Browser-session cookie, like normal logins; the token's own 24 h expiry is the hard limit.
    res.cookie(SESSION_COOKIE, accessToken, sessionCookieOptions(secure));
  }

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 8, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Start a guest checkout session (password-less shadow account, sets HttpOnly cookie)' })
  async create(@Body() dto: CreateGuestDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.guest.createGuest(dto);
    this.startSession(res, accessToken);
    return { user };
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @ApiOperation({ summary: 'Open a guest session from the emailed order link' })
  async session(@Body() dto: GuestSessionDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.guest.startSessionFromLink(dto.token);
    this.startSession(res, accessToken);
    return { user };
  }

  @Post('order-link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000, bodyKey: 'email' })
  @ApiOperation({ summary: 'Email a new order link (same answer whether or not the order exists)' })
  async orderLink(@Body() dto: GuestOrderLinkDto) {
    return this.guest.requestOrderLink(dto.email, dto.orderNumber);
  }

  @Post('claim/start')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Guest: email a code to turn the guest account into a real account' })
  async claimStart(@CurrentUser('id') userId: string) {
    return this.guest.startClaim(userId);
  }

  @Post('claim/complete')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({ summary: 'Guest: confirm the code and set a password' })
  async claimComplete(@CurrentUser('id') userId: string, @Body() dto: ClaimCompleteDto) {
    return { user: await this.guest.completeClaim(userId, dto.code, dto.password) };
  }
}
