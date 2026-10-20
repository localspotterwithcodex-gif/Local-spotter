import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { EmployeesModule } from '../employees/employees.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatAdminController, ChatJobsController } from './chat-admin.controller';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MediaModule, NotificationsModule, EmployeesModule],
  controllers: [ChatController, ChatAdminController, ChatJobsController],
  providers: [ChatService, PrismaService, RateLimitGuard, CronSecretGuard],
})
export class ChatModule {}
