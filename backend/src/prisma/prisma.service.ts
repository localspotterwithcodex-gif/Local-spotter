import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Interactive transactions (orders, bookings, refunds…) run several queries in
 * a row. Prisma's default 5 s timeout is too tight when the database is a
 * serverless Postgres in another region (each round trip is 100–300 ms), and
 * surfaces as a 500 "Transaction already closed". Configurable via env; the
 * defaults leave generous headroom while still bounding lock hold time.
 */
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      transactionOptions: {
        maxWait: num(process.env.PRISMA_TX_MAX_WAIT_MS, 10_000),
        timeout: num(process.env.PRISMA_TX_TIMEOUT_MS, 20_000),
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
