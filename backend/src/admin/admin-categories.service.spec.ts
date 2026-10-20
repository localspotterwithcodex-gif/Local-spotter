import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminCategoriesService } from './admin-categories.service';

function make() {
  const cat = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ id: 'c1', slug: 'bakery' }),
    create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'c1', ...data })),
    update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'c1', ...data })),
    delete: jest.fn().mockResolvedValue({}),
  });
  const prisma: any = {
    businessCategory: cat(),
    productCategory: cat(),
    business: { count: jest.fn().mockResolvedValue(0) },
    businessesWithCategories: { count: jest.fn().mockResolvedValue(0) },
    product: { count: jest.fn().mockResolvedValue(0) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return { svc: new AdminCategoriesService(prisma), prisma };
}

describe('AdminCategoriesService', () => {
  it('creates with a generated ASCII slug and audit-logs it', async () => {
    const { svc, prisma } = make();
    await svc.create('a1', 'business', { name: 'Café & Bakkerij' });
    expect(prisma.businessCategory.create.mock.calls[0][0].data).toMatchObject({ name: 'Café & Bakkerij', slug: 'cafe-bakkerij' });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorUserId: 'a1', action: 'CATEGORY_CREATED' });
  });

  it('maps a duplicate slug to 409 and rejects names that produce no slug', async () => {
    const { svc, prisma } = make();
    prisma.productCategory.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(svc.create('a1', 'product', { name: 'Taart' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.create('a1', 'product', { name: '!!' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to delete a category in use, deletes an unused one', async () => {
    const { svc, prisma } = make();
    prisma.product.count.mockResolvedValue(3);
    await expect(svc.remove('a1', 'product', 'c1')).rejects.toBeInstanceOf(ConflictException);
    prisma.product.count.mockResolvedValue(0);
    await svc.remove('a1', 'product', 'c1');
    expect(prisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('counts both business category links before deleting', async () => {
    const { svc, prisma } = make();
    prisma.businessesWithCategories.count.mockResolvedValue(1);
    await expect(svc.remove('a1', 'business', 'c1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s when updating a missing category and only writes provided fields', async () => {
    const { svc, prisma } = make();
    prisma.businessCategory.findUnique.mockResolvedValue(null);
    await expect(svc.update('a1', 'business', 'x', { active: false })).rejects.toBeInstanceOf(NotFoundException);
    prisma.businessCategory.findUnique.mockResolvedValue({ id: 'c1' });
    await svc.update('a1', 'business', 'c1', { active: false });
    expect(prisma.businessCategory.update.mock.calls[0][0].data).toEqual({ active: false });
  });
});
