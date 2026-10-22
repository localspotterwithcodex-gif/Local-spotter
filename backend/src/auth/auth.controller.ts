import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SocialLoginDto } from './dto/social-login.dto';
import { SocialTokenVerifier } from './social/social-token.verifier';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto, ResendCodeDto } from './dto/verify-code.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowGuest } from '../common/decorators/allow-guest.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { SESSION_COOKIE, sessionCookieOptions } from './utils/session-cookie';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly socialVerifier: SocialTokenVerifier,
  ) {}

  /**
   * Sets the HttpOnly session cookie. The access token is NEVER returned in
   * the response body, so page scripts (and any XSS) cannot read it.
   */
  private startSession(res: Response, accessToken: string): void {
    const secure = this.config.get<string>('NODE_ENV') === 'production' || this.config.get<string>('COOKIE_SECURE') === 'true';
    res.cookie(SESSION_COOKIE, accessToken, sessionCookieOptions(secure));
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60 * 60 * 1000 })
  @ApiOperation({ summary: 'Register a new Consumer or Business Owner account' })
  @ApiResponse({ status: 201, description: 'Account successfully created.', type: AuthResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000, bodyKey: 'identifier' })
  @ApiOperation({ summary: 'Authenticate user with email/mobile/username and password (sets HttpOnly session cookie)' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto);
    this.startSession(res, accessToken);
    return { user };
  }

  @Post('social')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @ApiOperation({ summary: 'Sign in / sign up with Google (sets HttpOnly session cookie)' })
  async social(@Body() dto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
    const profile = await this.socialVerifier.verify(dto.provider, dto.token);
    const { accessToken, user } = await this.authService.completeSocialLogin(profile, dto.role);
    this.startSession(res, accessToken);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the session (clears the session cookie)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { message: 'Uitgelogd' };
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000, bodyKey: 'identifier' })
  @ApiOperation({ summary: 'Confirm the OTP/email code sent at registration and activate the account' })
  @ApiResponse({ status: 200, description: 'Account verified, access token issued.', type: AuthResponseDto })
  async verifyCode(@Body() dto: VerifyCodeDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.verifyCode(dto.identifier, dto.code);
    this.startSession(res, accessToken);
    return { user };
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, windowMs: 10 * 60 * 1000, bodyKey: 'identifier' })
  @ApiOperation({ summary: 'Resend the OTP/email verification code' })
  @ApiResponse({ status: 200, description: 'Code resent if account exists and is unverified.' })
  async resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerificationCode(dto.identifier);
  }

  @Get('me')
  @AllowGuest()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile information for authenticated user' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile retrieved.' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 3, windowMs: 60 * 60 * 1000, bodyKey: 'email' })
  @ApiOperation({ summary: 'Request password reset token' })
  @ApiResponse({ status: 200, description: 'Instructions sent if email exists.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password successfully updated.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
