import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, RateLimitGuard],
})
export class ChatModule {}
