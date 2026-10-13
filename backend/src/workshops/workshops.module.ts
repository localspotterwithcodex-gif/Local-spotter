import { Module } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  providers: [WorkshopsService],
  controllers: [WorkshopsController],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
