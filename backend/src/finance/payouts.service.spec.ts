import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { encryptSecret } from '../common/crypto/secret-box';
import { PayoutsService, csvCell } from './payouts.service';

const KEY = Buffer.alloc(32, 9);
const KEY_B64 = KEY.toString('base64');

function make(config: Record<string, string> = { ENCRYPTION_KEY: KEY_B64 }) {
  const prisma: any = {
    payoutAccount: { findMany: jest.fn().mockResolvedValue([{ businessId: 'b1', accountHolderName: 'Jansen BV', ibanEncrypted: 'v1:x:y:z' }]) },
    payout: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'po1', businessId: 'b1', amount: '120.00', status: 'PAID' }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'po1', ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    businessLedgerEntry: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 12000 } }),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    business: { findUnique: jest.fn().mockResolvedValue({ ownerProfile: { userId: 'owner-u' } }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction = jest.fn(async (cb: any) => cb(prisma));
  const notifications: any = { notifyUser: jest.fn().mockResolvedValue(undefined) };
  const svc = new PayoutsService(prisma, { get: (k: string) => config[k] } as any, notifications);
  return { svc, prisma, notifications };
}

describe('PayoutsService.runWeekly', () => {
  it('creates a PENDING payout with an encrypted IBAN snapshot, a PAYOUT debit and a notification', async () => {
    const { svc, prisma, notifications } = make();
    const res = await svc.runWeekly(new Date('2026-10-19T08:00:00Z'));
    expect(res).toEqual({ periodKey: '2026-W43', created: 1, alreadyExists: 0, belowMinimum: 0, failed: 0 });
    expect(prisma.payout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ businessId: 'b1', amount: '120.00', status: 'PENDING', periodKey: '2026-W43', ibanEncrypted: 'v1:x:y:z', accountHolder: 'Jansen BV' }),
    });
    expect(prisma.businessLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'PAYOUT', amountCents: -12000, payoutId: 'po1' }),
    });
    expect(prisma.$queryRaw).toHaveBeenCalled(); // advisory lock
    expect(notifications.notifyUser).toHaveBeenCalledWith('owner-u', 'PAYOUT', expect.any(String), expect.any(String), expect.any(Object));
  });

  it('is idempotent for the same week', async () => {
    const { svc, prisma } = make();
    prisma.payout.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await svc.runWeekly(new Date('2026-10-19T08:00:00Z'));
    expect(res.alreadyExists).toBe(1);
    expect(prisma.payout.create).not.toHaveBeenCalled();
    expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('skips balances below the minimum and negative balances', async () => {
    const { svc, prisma } = make({ PAYOUT_MIN_CENTS: '5000' });
    prisma.businessLedgerEntry.aggregate.mockResolvedValue({ _sum: { amountCents: 4999 } });
    expect((await svc.runWeekly()).belowMinimum).toBe(1);
    prisma.businessLedgerEntry.aggregate.mockResolvedValue({ _sum: { amountCents: -300 } });
    expect((await svc.runWeekly()).belowMinimum).toBe(1);
    expect(prisma.payout.create).not.toHaveBeenCalled();
  });

  it('only considers stores that have a bank account and are not deleted', async () => {
    const { svc, prisma } = make();
    await svc.runWeekly();
    expect(prisma.payoutAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ibanEncrypted: { not: null }, business: { deletedAt: null } } }),
    );
  });

  it('continues with the other stores when one fails, and does not leak the error', async () => {
    const { svc, prisma } = make();
    prisma.payoutAccount.findMany.mockResolvedValue([
      { businessId: 'b1', accountHolderName: 'A', ibanEncrypted: 'v1:x:y:z' },
      { businessId: 'b2', accountHolderName: 'B', ibanEncrypted: 'v1:x:y:z' },
    ]);
    prisma.payout.create.mockRejectedValueOnce(new Error('db down')).mockImplementation(async ({ data }: any) => ({ id: 'po2', ...data }));
    const res = await svc.runWeekly();
    expect(res).toMatchObject({ created: 1, failed: 1 });
  });
});

describe('PayoutsService admin actions', () => {
  it('marks an open payout paid with the bank reference and audits it', async () => {
    const { svc, prisma, notifications } = make();
    const out = await svc.markPaid('po1', 'admin-1', 'SEPA-1');
    expect(prisma.payout.updateMany).toHaveBeenCalledWith({
      where: { id: 'po1', status: { in: ['PENDING', 'APPROVED'] } },
      data: expect.objectContaining({ status: 'PAID', providerReference: 'SEPA-1' }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'PAYOUT_MARKED_PAID', actorUserId: 'admin-1' }) });
    expect(out.status).toBe('PAID');
    expect(notifications.notifyUser).toHaveBeenCalled();
  });

  it('refuses to change a payout that is already final, and reports unknown ids', async () => {
    const { svc, prisma } = make();
    prisma.payout.updateMany.mockResolvedValue({ count: 0 });
    prisma.payout.findUnique.mockResolvedValue({ status: 'PAID' });
    await expect(svc.markPaid('po1', 'a', 'x')).rejects.toThrow(ConflictException);
    prisma.payout.findUnique.mockResolvedValue(null);
    await expect(svc.fail('po1', 'a', 'REJECTED', 'no')).rejects.toThrow(NotFoundException);
  });

  it('credits a rejected payout back to the balance exactly once', async () => {
    const { svc, prisma } = make();
    prisma.payout.findUniqueOrThrow.mockResolvedValue({ id: 'po1', businessId: 'b1', status: 'REJECTED' });
    prisma.businessLedgerEntry.findFirst.mockResolvedValueOnce({ businessId: 'b1', amountCents: -12000, currency: 'EUR' }).mockResolvedValueOnce(null);
    await svc.fail('po1', 'admin-1', 'REJECTED', 'IBAN klopt niet');
    expect(prisma.businessLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'PAYOUT_REVERSAL', amountCents: 12000, payoutId: 'po1' }),
    });

    prisma.businessLedgerEntry.create.mockClear();
    prisma.businessLedgerEntry.findFirst.mockResolvedValueOnce({ businessId: 'b1', amountCents: -12000, currency: 'EUR' }).mockResolvedValueOnce({ id: 'already' });
    await svc.fail('po1', 'admin-1', 'FAILED', 'bank retour');
    expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
  });
});

describe('PayoutsService.exportOpenPayouts', () => {
  const row = (over: any = {}) => ({
    id: 'po1',
    amount: { toString: () => '120.00' },
    currency: 'EUR',
    accountHolder: 'Jansen BV',
    periodKey: '2026-W43',
    ibanEncrypted: encryptSecret('NL91ABNA0417164300', KEY),
    business: { name: 'Bloemen' },
    ...over,
  });

  it('decrypts IBANs for the CSV and audits the export without writing IBANs to the log', async () => {
    const { svc, prisma } = make();
    prisma.payout.findMany.mockResolvedValue([row()]);
    const out = await svc.exportOpenPayouts('admin-1');
    expect(out.rows).toBe(1);
    expect(out.csv.split('\n')[0]).toBe('payout_id,business,account_holder,iban,amount,currency,reference');
    expect(out.csv).toContain('"NL91ABNA0417164300"');
    const audit = JSON.stringify(prisma.auditLog.create.mock.calls);
    expect(audit).toContain('PAYOUT_EXPORTED');
    expect(audit).not.toContain('NL91');
  });

  it('skips rows it cannot decrypt instead of exporting garbage', async () => {
    const { svc, prisma } = make();
    prisma.payout.findMany.mockResolvedValue([row({ ibanEncrypted: 'v1:AAAA:BBBB:CCCC' })]);
    const out = await svc.exportOpenPayouts('admin-1');
    expect(out).toMatchObject({ rows: 0, skipped: 1 });
  });

  it('is unavailable without ENCRYPTION_KEY', async () => {
    const { svc } = make({});
    await expect(svc.exportOpenPayouts('admin-1')).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('csvCell', () => {
  it('quotes values and neutralises spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+31')).toBe(`"'+31"`);
    expect(csvCell(12)).toBe('"12"');
  });
});
