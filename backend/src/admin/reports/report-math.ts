import { LEDGER } from '../../finance/ledger';

/** Ledger totals in cents, from the platform's point of view. Same definitions as FinanceService's balance. */
export interface LedgerTotals {
  grossSalesCents: number; // SALE
  refundsCents: number; // REFUND + REFUND_PENDING (a pending entry becomes REFUND or REFUND_FAILED in place)
  commissionCents: number; // COMMISSION minus COMMISSION_REVERSAL
  netOwedCents: number; // what the shop earned: gross - refunds - commission
}

export function ledgerTotals(rows: { type: string; amountCents: number }[]): LedgerTotals {
  const sum = (...types: string[]) => rows.reduce((t, r) => (types.includes(r.type) ? t + r.amountCents : t), 0);
  const grossSalesCents = sum(LEDGER.SALE);
  const refundsCents = -sum(LEDGER.REFUND, LEDGER.REFUND_PENDING);
  const commissionCents = -sum(LEDGER.COMMISSION, LEDGER.COMMISSION_REVERSAL);
  return { grossSalesCents, refundsCents, commissionCents, netOwedCents: grossSalesCents - refundsCents - commissionCents };
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Minutes Europe/Amsterdam is ahead of UTC at `at` (60 in winter, 120 in summer). */
function amsterdamOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')!.value; // e.g. "GMT+1"
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** [start, end) of a calendar month in Amsterdam time, as UTC instants. Throws on anything but YYYY-MM. */
export function amsterdamMonthRange(month: string): { start: Date; end: Date } {
  const m = MONTH.exec(month);
  if (!m) throw new Error('month must be YYYY-MM');
  const midnight = (y: number, mo: number) => {
    const utc = Date.UTC(y, mo - 1, 1); // the 1st of a month is never on a DST switch day
    return new Date(utc - amsterdamOffsetMinutes(new Date(utc)) * 60_000);
  };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return { start: midnight(y, mo), end: mo === 12 ? midnight(y + 1, 1) : midnight(y, mo + 1) };
}

/** Months from `from` to `to` inclusive (YYYY-MM), at most `max` of them. */
export function monthsBetween(from: string, to: string, max = 36): string[] {
  amsterdamMonthRange(from);
  amsterdamMonthRange(to);
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  while (`${y}-${String(m).padStart(2, '0')}` <= to) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (out.length > max) throw new Error(`at most ${max} months`);
    m === 12 ? ((y += 1), (m = 1)) : (m += 1);
  }
  if (!out.length) throw new Error('from must not be after to');
  return out;
}

export const toCents = (amount: { toString(): string } | number | null | undefined): number =>
  amount == null ? 0 : Math.round(Number(amount.toString()) * 100);
