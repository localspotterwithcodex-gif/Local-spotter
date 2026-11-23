import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ChatJobsController } from '../../chat/chat-admin.controller';
import { PayoutsJobsController } from '../../finance/payouts-jobs.controller';
import { GuestJobsController } from '../../guest/guest-jobs.controller';
import { NotificationsJobsController } from '../../notifications/notifications-jobs.controller';
import { PaymentsJobsController } from '../../payments/payments-jobs.controller';
import { WorkshopsJobsController } from '../../workshops/workshops-jobs.controller';

const JOBS: [Function, string][] = [
  [ChatJobsController, 'chat-retention'],
  [PayoutsJobsController, 'weekly-payouts'],
  [GuestJobsController, 'cleanup-guests'],
  [NotificationsJobsController, 'subscription-reminders'],
  [PaymentsJobsController, 'expire-unpaid-orders'],
  [WorkshopsJobsController, 'expire-unpaid-bookings'],
];

/** Vercel Cron calls GET; other schedulers POST. Two route decorators on one method would silently keep only one. */
describe('internal job routes', () => {
  it.each(JOBS)('%p serves %s on both GET and POST', (controller, path) => {
    const methods = Object.getOwnPropertyNames(controller.prototype)
      .map((name) => controller.prototype[name])
      .filter((fn) => typeof fn === 'function' && Reflect.getMetadata(PATH_METADATA, fn) === path)
      .map((fn) => Reflect.getMetadata(METHOD_METADATA, fn));
    expect(methods.sort()).toEqual([RequestMethod.GET, RequestMethod.POST].sort());
  });
});
