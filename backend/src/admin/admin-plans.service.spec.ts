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

  describe('update', () => {
    const existing = { id: 'p1', slug: 'WEBSHOP', name: 'Webshop', description: 'Old', monthlyPrice: { toString: () => '12.00' }, commissionBps: null, active: true };
    const makeEdit = () => {
      const m = make();
      m.prisma.subscriptionPlan.findUnique.mockResolvedValue(existing);
      m.prisma.subscriptionPlan.update.mockImplementation(async ({ data }: any) => ({ ...existing, ...data, monthlyPrice: { toString: () => String(data.monthlyPrice ?? 12) } }));
      return m;
    };

    it('saves the edited fields, trims text, and audits before/after', async () => {
      const { svc, prisma } = makeEdit();
      const out = await svc.update('p1', { name: '  Webshop Plus ', description: ' New text ', monthlyPrice: 14.5, active: false }, 'admin-1');
      expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { name: 'Webshop Plus', description: 'New text', monthlyPrice: 14.5, active: false } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'ADMIN_UPDATE_PLAN', targetId: 'p1', metadata: expect.objectContaining({ from: expect.objectContaining({ name: 'Webshop', monthlyPrice: 12 }) }) }),
      });
      expect(out).toMatchObject({ slug: 'WEBSHOP', name: 'Webshop Plus', monthlyPrice: 14.5, active: false });
    });

    it('allows a free plan (price 0) but never changes the slug', async () => {
      const { svc, prisma } = makeEdit();
      await svc.update('p1', { monthlyPrice: 0 }, 'a');
      expect(prisma.subscriptionPlan.update.mock.calls[0][0].data).toEqual({ monthlyPrice: 0 });
    });

    it('rejects blank names, negative or absurd prices, empty edits and unknown plans', async () => {
      const { svc, prisma } = makeEdit();
      await expect(svc.update('p1', { name: '   ' }, 'a')).rejects.toThrow(BadRequestException);
      await expect(svc.update('p1', { monthlyPrice: -1 }, 'a')).rejects.toThrow(BadRequestException);
      await expect(svc.update('p1', { monthlyPrice: 10001 }, 'a')).rejects.toThrow(BadRequestException);
      await expect(svc.update('p1', { monthlyPrice: NaN }, 'a')).rejects.toThrow(BadRequestException);
      await expect(svc.update('p1', {}, 'a')).rejects.toThrow(BadRequestException);
      expect(prisma.subscriptionPlan.update).not.toHaveBeenCalled();
      const missing = make();
      missing.prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      await expect(missing.svc.update('p1', { name: 'x' }, 'a')).rejects.toThrow(NotFoundException);
    });
  });
});
