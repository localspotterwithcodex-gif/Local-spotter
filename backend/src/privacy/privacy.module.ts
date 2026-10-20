import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService, PrismaService, RateLimitGuard],
})
export class PrivacyModule {}
