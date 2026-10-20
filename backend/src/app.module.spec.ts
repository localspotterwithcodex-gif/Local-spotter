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
import { MollieGateway } from './payments/mollie.gateway';
import { UnconfiguredPaymentGateway } from './payments/payment-gateway';

/**
 * Catches wiring mistakes (missing imports/providers, circular module imports)
 * that unit tests with hand-built mocks cannot see. No database is touched.
 */
describe('AppModule dependency graph', () => {
  const prismaStub = { onModuleInit: jest.fn(), onModuleDestroy: jest.fn(), $connect: jest.fn(), $disconnect: jest.fn() };

  it('resolves every provider and binds no payment provider without MOLLIE_API_KEY', async () => {
    delete process.env.MOLLIE_API_KEY;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    expect(moduleRef.get(PAYMENT_GATEWAY, { strict: false })).toBeInstanceOf(UnconfiguredPaymentGateway);
    await moduleRef.close();
  });

  it('binds the Mollie gateway when MOLLIE_API_KEY is set', async () => {
    process.env.MOLLIE_API_KEY = 'test_abcdefghijklmnopqrstuvwxyz123456';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    expect(moduleRef.get(PAYMENT_GATEWAY, { strict: false })).toBeInstanceOf(MollieGateway);
    await moduleRef.close();
    delete process.env.MOLLIE_API_KEY;
  });
});
