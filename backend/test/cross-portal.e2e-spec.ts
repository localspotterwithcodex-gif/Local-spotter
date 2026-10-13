/**
 * Cross-portal integration tests against a REAL PostgreSQL database (no mocks).
 *
 * Run only against a disposable database:
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/localspotter_test npm run test:e2e
 * (apply migrations first: DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy)
 *
 * Without TEST_DATABASE_URL the suite is skipped, so `npm test` never touches a database.
 * Every record is created with a unique run id and removed in afterAll.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { AddressInfo } from 'net';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const TEST_DB = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DB ? describe : describe.skip;

const ORIGIN = 'http://localhost:3000';
const RUN = crypto.randomBytes(4).toString('hex');
const PASSWORD = 'Test-Passw0rd!';

interface Session {
  cookie: string;
}

describeDb('cross-portal flows (real database)', () => {
  let app: INestApplication;
  let base: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const ids = {
    ownerA: '', ownerB: '', consumerA: '', consumerB: '', admin: '',
    businessA: '', businessB: '', pendingBusiness: '', product: '', order: '', workshop: '', plan: '',
  };
  let ownerA: Session, ownerB: Session, consumerA: Session, consumerB: Session, admin: Session;

  async function http(method: string, path: string, opts: { session?: Session; body?: unknown } = {}) {
    const res = await fetch(`${base}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        ...(opts.session ? { Cookie: opts.session.cookie } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    return { status: res.status, json: json as any, setCookie: res.headers.get('set-cookie') }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  async function login(identifier: string): Promise<Session> {
    const r = await http('POST', '/auth/login', { body: { identifier, password: PASSWORD } });
    expect(r.status).toBe(200);
    expect(r.json.accessToken).toBeUndefined(); // token must never be in the body
    expect(r.setCookie).toMatch(/ls_session=/);
    expect(r.setCookie).toMatch(/HttpOnly/i);
    return { cookie: r.setCookie!.split(';')[0] };
  }

  async function makeUser(role: 'CONSUMER' | 'BUSINESS_OWNER' | 'SUPER_ADMIN', tag: string) {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const user = await prisma.user.create({
      data: {
        email: `${tag}-${RUN}@e2e.test`,
        username: role === 'SUPER_ADMIN' ? `${tag}-${RUN}` : undefined,
        passwordHash,
        role,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        ...(role === 'CONSUMER' ? { consumerProfile: { create: { displayName: `Consumer ${tag}` } } } : {}),
        ...(role === 'BUSINESS_OWNER' ? { businessOwnerProfile: { create: { displayName: `Owner ${tag}` } } } : {}),
      },
      include: { businessOwnerProfile: true },
    });
    return user;
  }

  async function makeBusiness(ownerProfileId: string, tag: string, status: string) {
    const b = await prisma.business.create({
      data: {
        ownerProfileId, name: `Shop ${tag} ${RUN}`, slug: `shop-${tag}-${RUN}`, kvkNumber: '12345678',
        state: 'Noord-Holland', city: 'Amsterdam', street: 'Teststraat', status,
      },
    });
    await prisma.businessSubscription.create({
      data: {
        businessId: b.id, planId: ids.plan, status: 'ACTIVE',
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      },
    });
    return b;
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.CORS_ORIGIN = ORIGIN;
    process.env.FRONTEND_URL = ORIGIN;
    process.env.MAIL_TRANSPORT = 'dev-file';
    process.env.NODE_ENV = 'test';

    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('../src/app.module');
    const { PrismaService } = await import('../src/prisma/prisma.service');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    prisma = app.get(PrismaService);

    const plan =
      (await prisma.subscriptionPlan.findUnique({ where: { slug: 'WORKSHOP' } })) ??
      (await prisma.subscriptionPlan.create({ data: { name: 'Workshop', slug: 'WORKSHOP', monthlyPrice: 150 } }));
    ids.plan = plan.id;

    const oa = await makeUser('BUSINESS_OWNER', 'ownerA');
    const ob = await makeUser('BUSINESS_OWNER', 'ownerB');
    const ca = await makeUser('CONSUMER', 'consumerA');
    const cb = await makeUser('CONSUMER', 'consumerB');
    const ad = await makeUser('SUPER_ADMIN', 'admin');
    Object.assign(ids, { ownerA: oa.id, ownerB: ob.id, consumerA: ca.id, consumerB: cb.id, admin: ad.id });
    ids.businessA = (await makeBusiness(oa.businessOwnerProfile.id, 'a', 'ACTIVE')).id;
    ids.businessB = (await makeBusiness(ob.businessOwnerProfile.id, 'b', 'ACTIVE')).id;
    ids.pendingBusiness = (await makeBusiness(ob.businessOwnerProfile.id, 'pending', 'PENDING_APPROVAL')).id;

    ownerA = await login(`ownerA-${RUN}@e2e.test`);
    ownerB = await login(`ownerB-${RUN}@e2e.test`);
    consumerA = await login(`consumerA-${RUN}@e2e.test`);
    consumerB = await login(`consumerB-${RUN}@e2e.test`);
    admin = await login(`admin-${RUN}`);
  });

  afterAll(async () => {
    if (prisma) {
      const userIds = [ids.ownerA, ids.ownerB, ids.consumerA, ids.consumerB, ids.admin].filter(Boolean);
      const bizIds = [ids.businessA, ids.businessB, ids.pendingBusiness].filter(Boolean);
      await prisma.workshopBooking.deleteMany({ where: { workshop: { businessId: { in: bizIds } } } });
      await prisma.workshop.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.orderStatusEvent.deleteMany({ where: { order: { businessId: { in: bizIds } } } });
      await prisma.orderItem.deleteMany({ where: { order: { businessId: { in: bizIds } } } });
      await prisma.order.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.cartItem.deleteMany({ where: { cart: { businessId: { in: bizIds } } } });
      await prisma.cart.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.productImage.deleteMany({ where: { product: { businessId: { in: bizIds } } } });
      await prisma.product.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.businessSubscription.deleteMany({ where: { businessId: { in: bizIds } } });
      await prisma.business.deleteMany({ where: { id: { in: bizIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  });

  describe('auth & CSRF', () => {
    it('protected endpoints reject anonymous users', async () => {
      expect((await http('GET', '/orders')).status).toBe(401);
      expect((await http('GET', '/admin/dashboard')).status).toBe(401);
    });

    it('cookie-authenticated writes from a foreign origin are blocked', async () => {
      const res = await fetch(`${base}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Origin: 'https://evil.example', Cookie: consumerA.cookie },
      });
      expect(res.status).toBe(403);
    });

    it('rejects a wrong password with a generic 401', async () => {
      const r = await http('POST', '/auth/login', { body: { identifier: `consumerA-${RUN}@e2e.test`, password: 'nope-nope-nope' } });
      expect(r.status).toBe(401);
    });

    it('roles are enforced by the backend', async () => {
      expect((await http('GET', '/admin/dashboard', { session: consumerA })).status).toBe(403);
      expect((await http('GET', '/admin/dashboard', { session: ownerA })).status).toBe(403);
      expect((await http('GET', '/admin/dashboard', { session: admin })).status).toBe(200);
      expect((await http('POST', '/cart/items', { session: ownerA, body: {} })).status).toBe(403);
    });
  });

  describe('owner publishes a product → public catalogue → consumer orders → owner/admin see it', () => {
    it('product created by the owner appears in the public catalogue', async () => {
      const created = await http('POST', `/businesses/${ids.businessA}/products`, {
        session: ownerA, body: { name: `Kaas ${RUN}`, price: 12.5, stock: 10 },
      });
      expect(created.status).toBe(201);
      ids.product = created.json.id;

      const list = await http('GET', `/products?businessId=${ids.businessA}`);
      expect(list.status).toBe(200);
      expect(list.json.map((p: { id: string }) => p.id)).toContain(ids.product);
    });

    it("another owner cannot create products for someone else's business", async () => {
      const r = await http('POST', `/businesses/${ids.businessA}/products`, {
        session: ownerB, body: { name: 'Hijack', price: 1, stock: 1 },
      });
      expect([403, 404]).toContain(r.status);
    });

    it('consumer orders; totals come from the server, not the client', async () => {
      const add = await http('POST', '/cart/items', {
        session: consumerA, body: { businessId: ids.businessA, productId: ids.product, quantity: 2 },
      });
      expect(add.status).toBe(201);
      const order = await http('POST', '/orders', {
        session: consumerA,
        body: { deliveryAddress: { street: 'Teststraat', houseNumber: '1', city: 'Amsterdam', postalCode: '1011AA' } },
      });
      expect(order.status).toBe(201);
      ids.order = order.json.id;
      expect(Number(order.json.subtotalAmount)).toBe(25);
    });

    it('the order is visible to the consumer, the owning business and the admin', async () => {
      const mine = await http('GET', '/orders', { session: consumerA });
      expect(mine.json.data.map((o: { id: string }) => o.id)).toContain(ids.order);
      const owner = await http('GET', `/businesses/${ids.businessA}/orders`, { session: ownerA });
      expect(owner.json.data.map((o: { id: string }) => o.id)).toContain(ids.order);
      const adm = await http('GET', '/admin/orders', { session: admin });
      expect(JSON.stringify(adm.json)).toContain(ids.order);
    });

    it('privacy: other consumers and other owners cannot read the order', async () => {
      expect([403, 404]).toContain((await http('GET', `/orders/${ids.order}`, { session: consumerB })).status);
      expect([403, 404]).toContain((await http('GET', `/orders/${ids.order}`, { session: ownerB })).status);
      expect([403, 404]).toContain((await http('GET', `/businesses/${ids.businessA}/orders`, { session: ownerB })).status);
      const theirs = await http('GET', '/orders', { session: consumerB });
      expect(theirs.json.data.map((o: { id: string }) => o.id)).not.toContain(ids.order);
    });

    it('order status changes by the owner propagate to the consumer', async () => {
      const upd = await http('PATCH', `/orders/${ids.order}/status`, { session: ownerA, body: { status: 'CONFIRMED' } });
      expect(upd.status).toBe(200);
      const seen = await http('GET', `/orders/${ids.order}`, { session: consumerA });
      expect(seen.json.status).toBe('CONFIRMED');
    });

    it('invalid transitions and foreign owners are rejected', async () => {
      expect((await http('PATCH', `/orders/${ids.order}/status`, { session: ownerA, body: { status: 'PENDING' } })).status).toBeGreaterThanOrEqual(400);
      expect([403, 404]).toContain((await http('PATCH', `/orders/${ids.order}/status`, { session: ownerB, body: { status: 'PREPARING' } })).status);
    });

    it('deactivating the product removes it from the public catalogue', async () => {
      expect((await http('PATCH', `/products/${ids.product}`, { session: ownerA, body: { active: false } })).status).toBe(200);
      const list = await http('GET', `/products?businessId=${ids.businessA}`);
      expect(list.json.map((p: { id: string }) => p.id)).not.toContain(ids.product);
    });
  });

  describe('admin approval controls public visibility', () => {
    it('a pending business is not listed until the admin approves it', async () => {
      const before = await http('GET', '/businesses');
      expect(before.json.map((b: { id: string }) => b.id)).not.toContain(ids.pendingBusiness);
      expect((await http('PATCH', `/businesses/${ids.pendingBusiness}/status`, { session: ownerB, body: { status: 'ACTIVE' } })).status).toBeGreaterThanOrEqual(400);
      const approve = await http('PATCH', `/admin/businesses/${ids.pendingBusiness}/status`, { session: admin, body: { status: 'ACTIVE' } });
      expect(approve.status).toBe(200);
      const after = await http('GET', '/businesses');
      expect(after.json.map((b: { id: string }) => b.id)).toContain(ids.pendingBusiness);
    });
  });

  describe('workshops & bookings', () => {
    it('owner publishes a workshop, consumers book it, capacity and visibility are enforced', async () => {
      const start = new Date(Date.now() + 7 * 864e5);
      const created = await http('POST', '/workshops', {
        session: ownerA,
        body: {
          title: `Kaas maken ${RUN}`, price: 20, capacity: 3, location: 'Amsterdam',
          startTime: start.toISOString(), endTime: new Date(start.getTime() + 36e5).toISOString(), status: 'PUBLISHED',
          businessId: ids.businessA,
        },
      });
      expect(created.status).toBe(201);
      ids.workshop = created.json.id;

      const pub = await http('GET', `/workshops/${ids.workshop}`);
      expect(pub.status).toBe(200);
      expect(pub.json.bookings).toBeUndefined(); // attendee identities are not public
      expect(pub.json.business.kvkNumber).toBeUndefined();

      const book = await http('POST', `/workshops/${ids.workshop}/bookings`, { session: consumerA, body: { quantity: 2 } });
      expect(book.status).toBe(201);
      const over = await http('POST', `/workshops/${ids.workshop}/bookings`, { session: consumerB, body: { quantity: 2 } });
      expect(over.status).toBeGreaterThanOrEqual(400); // only 1 seat left

      const mineA = await http('GET', '/workshops/bookings', { session: consumerA });
      expect(JSON.stringify(mineA.json)).toContain(book.json.id);
      const mineB = await http('GET', '/workshops/bookings', { session: consumerB });
      expect(JSON.stringify(mineB.json)).not.toContain(book.json.id);
      const ownerView = await http('GET', `/businesses/${ids.businessA}/workshop-bookings`, { session: ownerA });
      expect(JSON.stringify(ownerView.json)).toContain(book.json.id);
      expect([403, 404]).toContain((await http('GET', `/businesses/${ids.businessA}/workshop-bookings`, { session: ownerB })).status);
    });
  });
});
