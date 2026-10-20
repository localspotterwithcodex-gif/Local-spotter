import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EmployeeRole, EmployeeStatus, UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { EmployeesService } from './employees.service';

const owner = { id: 'u-owner', role: UserRole.BUSINESS_OWNER, profileId: 'op1', email: 'owner@x.nl' } as any;
const other = { id: 'u-other', role: UserRole.BUSINESS_OWNER, profileId: 'op2', email: 'o2@x.nl' } as any;
const business = { id: 'b1', name: 'Bakkerij', ownerProfileId: 'op1', deletedAt: null };

function make(mailOk = true) {
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue(business) },
    user: { findFirst: jest.fn().mockResolvedValue({ email: 'owner@x.nl' }) },
    merchantEmployee: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'e1', ...data })),
      update: jest.fn().mockImplementation(async ({ data, where }: any) => ({ id: where.id, email: 'a@x.nl', role: 'STAFF', status: 'INVITED', ...data })),
    },
  };
  const mail = { isConfigured: () => mailOk, supports: () => true, send: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (k: string) => (k === 'FRONTEND_URL' ? 'https://app.example' : undefined) };
  return { svc: new EmployeesService(prisma, config as any, mail as any), prisma, mail };
}

describe('EmployeesService', () => {
  it('only the shop owner (or admin) can manage employees', async () => {
    const { svc } = make();
    await expect(svc.list(other, 'b1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.invite(other, 'b1', 'a@x.nl', EmployeeRole.STAFF)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.list(owner, 'b1')).resolves.toEqual([]);
  });

  it('invites by e-mail with a hashed single-use token and a 7 day expiry', async () => {
    const { svc, prisma, mail } = make();
    await svc.invite(owner, 'b1', ' A@X.nl ', EmployeeRole.MANAGER);
    const data = prisma.merchantEmployee.create.mock.calls[0][0].data;
    expect(data.email).toBe('a@x.nl');
    expect(data.inviteTokenHash).toMatch(/^[0-9a-f]{64}$/);
    const text: string = mail.send.mock.calls[0][0].text;
    const token = /token=([0-9a-f]{64})/.exec(text)![1];
    expect(createHash('sha256').update(token).digest('hex')).toBe(data.inviteTokenHash);
    expect(text).toContain('https://app.example/staff/accept');
    expect(data.inviteExpiresAt.getTime() - Date.now()).toBeGreaterThan(6.9 * 86400000);
    expect(JSON.stringify(data)).not.toContain(token);
  });

  it('refuses to invite the owner, an existing active employee, or when mail is unavailable', async () => {
    const { svc, prisma } = make();
    await expect(svc.invite(owner, 'b1', 'OWNER@x.nl', EmployeeRole.STAFF)).rejects.toBeInstanceOf(BadRequestException);
    prisma.merchantEmployee.findUnique.mockResolvedValue({ id: 'e1', status: EmployeeStatus.ACTIVE });
    await expect(svc.invite(owner, 'b1', 'a@x.nl', EmployeeRole.STAFF)).rejects.toBeInstanceOf(ConflictException);
    await expect(make(false).svc.invite(owner, 'b1', 'a@x.nl', EmployeeRole.STAFF)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('re-invites a revoked employee by updating the same row', async () => {
    const { svc, prisma } = make();
    prisma.merchantEmployee.findUnique.mockResolvedValue({ id: 'e1', status: EmployeeStatus.REVOKED });
    await svc.invite(owner, 'b1', 'a@x.nl', EmployeeRole.STAFF);
    expect(prisma.merchantEmployee.update).toHaveBeenCalled();
    expect(prisma.merchantEmployee.create).not.toHaveBeenCalled();
  });

  describe('accept', () => {
    const invite = (over: any = {}) => ({
      id: 'e1',
      email: 'a@x.nl',
      status: EmployeeStatus.INVITED,
      inviteExpiresAt: new Date(Date.now() + 86400000),
      business: { id: 'b1', name: 'Bakkerij' },
      ...over,
    });
    const me = { id: 'u5', role: UserRole.CONSUMER, email: 'A@x.nl' } as any;

    it('activates the invite for the matching e-mail and burns the token', async () => {
      const { svc, prisma } = make();
      prisma.merchantEmployee.findUnique.mockResolvedValue(invite());
      await expect(svc.accept(me, 'x'.repeat(64))).resolves.toEqual({ businessId: 'b1', businessName: 'Bakkerij' });
      expect(prisma.merchantEmployee.update.mock.calls[0][0].data).toMatchObject({ userId: 'u5', status: 'ACTIVE', inviteTokenHash: null });
    });

    it('rejects expired, used or foreign invites', async () => {
      const { svc, prisma } = make();
      prisma.merchantEmployee.findUnique.mockResolvedValue(invite({ inviteExpiresAt: new Date(Date.now() - 1000) }));
      await expect(svc.accept(me, 'x'.repeat(64))).rejects.toBeInstanceOf(NotFoundException);
      prisma.merchantEmployee.findUnique.mockResolvedValue(invite({ status: EmployeeStatus.ACTIVE }));
      await expect(svc.accept(me, 'x'.repeat(64))).rejects.toBeInstanceOf(NotFoundException);
      prisma.merchantEmployee.findUnique.mockResolvedValue(invite());
      await expect(svc.accept({ ...me, email: 'evil@x.nl' }, 'x'.repeat(64))).rejects.toBeInstanceOf(ForbiddenException);
      prisma.merchantEmployee.findUnique.mockResolvedValue(null);
      await expect(svc.accept(me, 'x'.repeat(64))).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('revoke only touches rows of that shop', async () => {
    const { svc, prisma } = make();
    await expect(svc.revoke(owner, 'b1', 'e9')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.merchantEmployee.findFirst.mock.calls[0][0].where).toEqual({ id: 'e9', businessId: 'b1' });
    prisma.merchantEmployee.findFirst.mockResolvedValue({ id: 'e9' });
    await svc.revoke(owner, 'b1', 'e9');
    expect(prisma.merchantEmployee.update.mock.calls[0][0].data).toMatchObject({ status: 'REVOKED', inviteTokenHash: null });
  });

  it('canAccessShop: owner, admin, active staff — nobody else', async () => {
    const { svc, prisma } = make();
    expect(await svc.canAccessShop(owner, 'b1')).toBe(true);
    expect(await svc.canAccessShop({ id: 'a', role: UserRole.SUPER_ADMIN } as any, 'b1')).toBe(true);
    expect(await svc.canAccessShop(other, 'b1')).toBe(false);
    prisma.merchantEmployee.findFirst.mockResolvedValue({ id: 'e1' });
    expect(await svc.canAccessShop({ id: 'u5', role: UserRole.CONSUMER } as any, 'b1')).toBe(true);
  });
});
