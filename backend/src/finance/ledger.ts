/**
 * Ledger entry types of a store (amounts in cents, signed from the store's point of view).
 *
 *  SALE                +  paid amount of an order/booking (on hold until availableAt)
 *  COMMISSION          -  platform commission on that sale (same hold)
 *  REFUND_PENDING      -  refund reserved at the provider, not confirmed yet
 *  REFUND              -  confirmed refund
 *  REFUND_FAILED       0  reservation released (ignored in balances)
 *  COMMISSION_REVERSAL +  commission given back for a refunded amount
 *  PAYOUT              -  money moved into a payout
 *  PAYOUT_REVERSAL     +  payout rejected / failed: money returns to the balance
 */
export const LEDGER = {
  SALE: 'SALE',
  COMMISSION: 'COMMISSION',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUND: 'REFUND',
  REFUND_FAILED: 'REFUND_FAILED',
  COMMISSION_REVERSAL: 'COMMISSION_REVERSAL',
  PAYOUT: 'PAYOUT',
  PAYOUT_REVERSAL: 'PAYOUT_REVERSAL',
} as const;

/** Entry types that make up the spendable balance (REFUND_FAILED is excluded on purpose). */
export const BALANCE_TYPES: string[] = [
  LEDGER.SALE,
  LEDGER.COMMISSION,
  LEDGER.REFUND_PENDING,
  LEDGER.REFUND,
  LEDGER.COMMISSION_REVERSAL,
  LEDGER.PAYOUT,
  LEDGER.PAYOUT_REVERSAL,
];

export const DEFAULT_HOLD_DAYS = 14;
export const DEFAULT_PAYOUT_MIN_CENTS = 1000;

export function commissionCents(grossCents: number, bps: number): number {
  if (!Number.isFinite(grossCents) || !Number.isFinite(bps) || grossCents <= 0 || bps <= 0) return 0;
  return Math.round((grossCents * bps) / 10000);
}

/**
 * Commission to give back for a refund: proportional to the refunded part, never more than
 * what is still held (commission charged minus already reversed).
 */
export function commissionReversalCents(refundCents: number, bps: number, commissionChargedCents: number, alreadyReversedCents: number): number {
  const proportional = commissionCents(refundCents, bps);
  const remaining = Math.max(0, commissionChargedCents - alreadyReversedCents);
  return Math.min(proportional, remaining);
}

/** ISO-8601 week key such as `2026-W43` (UTC); the idempotency key of a weekly payout run. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
