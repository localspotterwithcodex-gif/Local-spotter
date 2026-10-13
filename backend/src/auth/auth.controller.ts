import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto, ResendCodeDto } from './dto/verify-code.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new Consumer or Business Owner account' })
  @ApiResponse({ status: 201, description: 'Account successfully created.', type: AuthResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with email/mobile/username and password' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-code')
  @ApiOperation({ summary: 'Confirm the OTP/email code sent at registration and activate the account' })
  @ApiResponse({ status: 200, description: 'Account verified, access token issued.', type: AuthResponseDto })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.identifier, dto.code);
  }

  @Post('resend-code')
  @ApiOperation({ summary: 'Resend the OTP/email verification code' })
  @ApiResponse({ status: 200, description: 'Code resent if account exists and is unverified.' })
  async resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerificationCode(dto.identifier);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile information for authenticated user' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile retrieved.' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token' })
  @ApiResponse({ status: 200, description: 'Instructions sent if email exists.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password successfully updated.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
