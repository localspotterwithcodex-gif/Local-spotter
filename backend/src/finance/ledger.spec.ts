import { commissionCents, commissionReversalCents, isoWeekKey } from './ledger';

describe('commission maths', () => {
  it('rounds to whole cents and ignores zero rates', () => {
    expect(commissionCents(10000, 500)).toBe(500);
    expect(commissionCents(1999, 500)).toBe(100); // 99.95 -> 100
    expect(commissionCents(1, 500)).toBe(0);
    expect(commissionCents(10000, 0)).toBe(0);
    expect(commissionCents(0, 500)).toBe(0);
    expect(commissionCents(-100, 500)).toBe(0);
    expect(commissionCents(Number.NaN, 500)).toBe(0);
  });

  it('reverses proportionally and never more than was charged', () => {
    // 10,00 sold at 5% = 50c commission; refund 4,00 -> 20c back
    expect(commissionReversalCents(400, 500, 50, 0)).toBe(20);
    // refunding the rest cannot exceed what is left (rounding safety)
    expect(commissionReversalCents(600, 500, 50, 20)).toBe(30);
    expect(commissionReversalCents(600, 500, 50, 50)).toBe(0);
    // three equal partial refunds of 3,33 on 9,99: sum of reversals <= charged
    const charged = commissionCents(999, 500); // 50
    let reversed = 0;
    for (let i = 0; i < 3; i++) reversed += commissionReversalCents(333, 500, charged, reversed);
    expect(reversed).toBeLessThanOrEqual(charged);
  });
});

describe('isoWeekKey', () => {
  it('follows ISO-8601 including year boundaries', () => {
    expect(isoWeekKey(new Date('2026-10-19T08:00:00Z'))).toBe('2026-W43');
    expect(isoWeekKey(new Date('2026-10-25T23:59:59Z'))).toBe('2026-W43');
    expect(isoWeekKey(new Date('2026-10-26T00:00:00Z'))).toBe('2026-W44');
    expect(isoWeekKey(new Date('2021-01-03T12:00:00Z'))).toBe('2020-W53');
    expect(isoWeekKey(new Date('2024-12-30T12:00:00Z'))).toBe('2025-W01');
  });
});
