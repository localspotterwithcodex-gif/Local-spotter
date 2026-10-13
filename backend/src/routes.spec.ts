import 'reflect-metadata';

// Controllers import services that load native bcrypt; the route table does not need it.
jest.mock('bcrypt', () => ({}));

import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { BusinessesController } from './businesses/businesses.controller';
import { CartController } from './cart/cart.controller';
import { FollowersController } from './followers/followers.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { OrdersController } from './orders/orders.controller';
import { PaymentsController } from './payments/payments.controller';
import { ProductsController } from './products/products.controller';
import { ReviewsController } from './reviews/reviews.controller';
import { ShopRegistrationsController } from './shop-registrations/shop-registrations.controller';
import { ShopRoutesController } from './shoproutes/shoproutes.controller';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { UsersController } from './users/users.controller';
import { WorkshopsController } from './workshops/workshops.controller';

type Route = { method: string; path: string };

function routesOf(controller: new (...a: never[]) => unknown): Route[] {
  const base = (Reflect.getMetadata(PATH_METADATA, controller) as string) ?? '';
  const proto = controller.prototype as Record<string, unknown>;
  const out: Route[] = [];
  for (const name of Object.getOwnPropertyNames(proto)) {
    const fn = proto[name];
    if (typeof fn !== 'function' || name === 'constructor') continue;
    const method = Reflect.getMetadata(METHOD_METADATA, fn);
    if (method === undefined) continue;
    const sub = (Reflect.getMetadata(PATH_METADATA, fn) as string) ?? '';
    const path = '/' + [base, sub].join('/').split('/').filter(Boolean).join('/');
    out.push({ method: RequestMethod[method], path });
  }
  return out;
}

const CONTROLLERS = [
  AdminController, AuthController, BusinessesController, CartController, FollowersController,
  NotificationsController, OrdersController, PaymentsController, ProductsController, ReviewsController,
  ShopRegistrationsController, ShopRoutesController, SubscriptionsController, UsersController, WorkshopsController,
];

// Express matches in declaration order (controller order, then method order).
const ALL: Route[] = CONTROLLERS.flatMap((c) => routesOf(c as never));

function matches(pattern: string, concrete: string): boolean {
  const p = pattern.split('/');
  const c = concrete.split('/');
  return p.length === c.length && p.every((seg, i) => seg.startsWith(':') || seg === c[i]);
}

describe('route table', () => {
  it('has no doubled path prefixes', () => {
    const doubled = ALL.filter((r) => /^\/([^/]+)\/\1(\/|$)/.test(r.path));
    expect(doubled).toEqual([]);
  });

  it('has no duplicate method+path pairs', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const r of ALL) {
      const k = `${r.method} ${r.path.replace(/:[^/]+/g, ':p')}`;
      if (seen.has(k)) dupes.push(k);
      seen.add(k);
    }
    expect(dupes).toEqual([]);
  });

  it('never lets a parameterised route shadow a later static route', () => {
    const shadowed: string[] = [];
    ALL.forEach((later, j) => {
      if (later.path.includes(':')) return;
      ALL.slice(0, j).forEach((earlier) => {
        if (earlier.method === later.method && earlier.path.includes(':') && matches(earlier.path, later.path)) {
          shadowed.push(`${earlier.method} ${earlier.path} shadows ${later.path}`);
        }
      });
    });
    expect(shadowed).toEqual([]);
  });

  it('exposes the public workshop and shop-route endpoints at their intended URLs', () => {
    const has = (m: string, p: string) => ALL.some((r) => r.method === m && r.path === p);
    expect(has('GET', '/workshops')).toBe(true);
    expect(has('GET', '/workshops/bookings')).toBe(true);
    expect(has('GET', '/workshops/:workshopId')).toBe(true);
    expect(has('POST', '/workshops/:workshopId/bookings')).toBe(true);
    expect(has('GET', '/shop-routes')).toBe(true);
    expect(has('GET', '/shop-routes/:routeId')).toBe(true);
  });
});
