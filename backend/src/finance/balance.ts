import { Prisma } from '@prisma/client';
import { BALANCE_TYPES } from './ledger';

type LedgerClient = Pick<Prisma.TransactionClient, 'businessLedgerEntry'>;

/** Spendable balance in cents: ledger entries whose hold has ended. May be negative after refunds. */
export async function availableBalanceCents(client: LedgerClient, businessId: string, now: Date): Promise<number> {
  const agg = await client.businessLedgerEntry.aggregate({
    where: {
      businessId,
      type: { in: BALANCE_TYPES },
      OR: [{ availableAt: null }, { availableAt: { lte: now } }],
    },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}
