import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { GuestService } from './guest.service';
import { GuestLinkService } from './guest-link.service';
import { GuestController } from './guest.controller';
import { GuestJobsController } from './guest-jobs.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [GuestController, GuestJobsController],
  providers: [GuestService, GuestLinkService, RateLimitGuard, CronSecretGuard],
  exports: [GuestService, GuestLinkService],
})
export class GuestModule {}
