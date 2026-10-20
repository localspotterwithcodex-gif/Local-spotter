import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminPlansService } from './admin-plans.service';

function make(config: Record<string, string> = {}) {
  const prisma: any = {
    subscriptionPlan: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1', name: 'Webshop', slug: 'WEBSHOP', monthlyPrice: { toString: () => '27.00' }, commissionBps: null, active: true }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', commissionBps: null }),
      update: jest.fn().mockResolvedValue({ id: 'p1', commissionBps: 500 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { svc: new AdminPlansService(prisma, { get: (k: string) => config[k] } as any), prisma };
}

describe('AdminPlansService', () => {
  it('lists plans with the platform default rate', async () => {
    const out = await make({ COMMISSION_DEFAULT_BPS: '300' }).svc.list();
    expect(out.defaultBps).toBe(300);
    expect(out.plans[0]).toMatchObject({ slug: 'WEBSHOP', monthlyPrice: 27, commissionBps: null });
  });

  it('sets, clears and audits the commission', async () => {
    const { svc, prisma } = make();
    await svc.setCommission('p1', 500, 'admin-1');
    expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { commissionBps: 500 } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ADMIN_SET_PLAN_COMMISSION', metadata: { from: null, to: 500 } }) });
    await svc.setCommission('p1', null, 'admin-1');
    expect(prisma.subscriptionPlan.update).toHaveBeenLastCalledWith({ where: { id: 'p1' }, data: { commissionBps: null } });
  });

  it('rejects out-of-range or fractional rates and unknown plans', async () => {
    const { svc } = make();
    for (const bad of [-1, 5001, 2.5]) await expect(svc.setCommission('p1', bad, 'a')).rejects.toThrow(BadRequestException);
    const missing = make();
    missing.prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    await expect(missing.svc.setCommission('p1', 100, 'a')).rejects.toThrow(NotFoundException);
  });
});
