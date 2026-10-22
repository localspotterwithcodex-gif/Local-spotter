import 'reflect-metadata';

// bcrypt is a native module; the dependency graph does not need it.
jest.mock('bcrypt', () => ({}));

process.env.JWT_SECRET = 'x'.repeat(48);
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.MAIL_TRANSPORT = 'dev-file';
process.env.NODE_ENV = 'test';

import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { PAYMENT_GATEWAY } from './payments/payment-gateway';
import { StripeGateway } from './payments/stripe.gateway';
import { UnconfiguredPaymentGateway } from './payments/payment-gateway';

/**
 * Catches wiring mistakes (missing imports/providers, circular module imports)
 * that unit tests with hand-built mocks cannot see. No database is touched.
 */
describe('AppModule dependency graph', () => {
  const prismaStub = { onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), $connect: jest.fn(), $disconnect: jest.fn() };

  it('resolves every provider and binds no payment provider without STRIPE_SECRET_KEY', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    expect(moduleRef.get(PAYMENT_GATEWAY, { strict: false })).toBeInstanceOf(UnconfiguredPaymentGateway);
    await moduleRef.close();
  });

  it('binds the Stripe gateway when STRIPE_SECRET_KEY is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abcdefghijklmnopqrstuvwxyz123456';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    expect(moduleRef.get(PAYMENT_GATEWAY, { strict: false })).toBeInstanceOf(StripeGateway);
    await moduleRef.close();
    delete process.env.STRIPE_SECRET_KEY;
  });
});
