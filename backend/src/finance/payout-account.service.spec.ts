import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { decryptSecret } from '../common/crypto/secret-box';
import { PayoutAccountService } from './payout-account.service';

const KEY = Buffer.alloc(32, 3);
const owner = { id: 'u1', role: UserRole.BUSINESS_OWNER } as any;
const IBAN = 'NL91 ABNA 0417 1643 00';

function make(config: Record<string, string> = { ENCRYPTION_KEY: KEY.toString('base64') }) {
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', ownerProfileId: 'p1', deletedAt: null }) },
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    payoutAccount: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockReturnValue('upsert') },
    auditLog: { create: jest.fn().mockReturnValue('audit') },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { svc: new PayoutAccountService(prisma, { get: (k: string) => config[k] } as any), prisma };
}

describe('PayoutAccountService', () => {
  it('stores the IBAN encrypted, returns it masked and keeps it out of the audit log', async () => {
    const { svc, prisma } = make();
    const out = await svc.upsert('b1', owner, { accountHolderName: ' Jansen BV ', iban: IBAN });
    expect(out).toEqual({ configured: true, accountHolderName: 'Jansen BV', ibanMasked: '•••• 4300' });
    const args = prisma.payoutAccount.upsert.mock.calls[0][0];
    expect(args.update.ibanEncrypted).not.toContain('NL91');
    expect(decryptSecret(args.update.ibanEncrypted, KEY)).toBe('NL91ABNA0417164300');
    expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain('NL91');
    expect(JSON.stringify(out)).not.toContain('NL91ABNA');
  });

  it('rejects an invalid IBAN and refuses to store anything without ENCRYPTION_KEY', async () => {
    await expect(make().svc.upsert('b1', owner, { accountHolderName: 'X', iban: 'NL91ABNA0417164301' })).rejects.toThrow(BadRequestException);
    const noKey = make({});
    await expect(noKey.svc.upsert('b1', owner, { accountHolderName: 'X', iban: IBAN })).rejects.toThrow(ServiceUnavailableException);
    expect(noKey.prisma.payoutAccount.upsert).not.toHaveBeenCalled();
  });

  it('accepts a non-IBAN account (e.g. India) when bank name, BIC and country are given, stored encrypted', async () => {
    const { svc, prisma } = make();
    const out = await svc.upsert('b1', owner, { accountHolderName: 'Priyadharshini V', iban: '1669 1200 0008 8', bankName: 'HDFC Bank', bic: 'hdfcinbb', country: 'in' });
    expect(out.ibanMasked).toBe('•••• 0088');
    const stored = decryptSecret(prisma.payoutAccount.upsert.mock.calls[0][0].update.ibanEncrypted, KEY);
    expect(stored).toBe('166912000088 | BIC HDFCINBB | HDFC Bank | IN');
    await expect(make().svc.upsert('b1', owner, { accountHolderName: 'X', iban: '166912000088' })).rejects.toMatchObject({ response: { code: 'BANK_DETAILS_REQUIRED' } });
    await expect(make().svc.upsert('b1', owner, { accountHolderName: 'X', iban: 'NL91ABNA0417164301', bankName: 'B', bic: 'ABNANL2A', country: 'NL' })).rejects.toMatchObject({ response: { code: 'IBAN_INVALID' } });
    await expect(make().svc.upsert('b1', owner, { accountHolderName: 'X', iban: '166912000088', bankName: 'B', bic: '123', country: 'IN' })).rejects.toMatchObject({ response: { code: 'BANK_DETAILS_INVALID' } });
  });

  it('is owner-only: other owners, admins and unknown stores are refused', async () => {
    const other = make();
    other.prisma.businessOwnerProfile.findUnique.mockResolvedValue({ id: 'someone-else' });
    await expect(other.svc.get('b1', owner)).rejects.toThrow(ForbiddenException);
    const noProfile = make();
    noProfile.prisma.businessOwnerProfile.findUnique.mockResolvedValue(null);
    await expect(noProfile.svc.get('b1', { id: 'a', role: UserRole.SUPER_ADMIN } as any)).rejects.toThrow(ForbiddenException);
    const missing = make();
    missing.prisma.business.findUnique.mockResolvedValue(null);
    await expect(missing.svc.get('b1', owner)).rejects.toThrow(NotFoundException);
  });

  it('reports an unconfigured account', async () => {
    expect(await make().svc.get('b1', owner)).toEqual({ configured: false, accountHolderName: null, ibanMasked: null });
  });
});
