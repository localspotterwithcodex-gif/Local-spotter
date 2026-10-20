import { NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let prisma: any;
  let service: FavoritesService;

  beforeEach(() => {
    prisma = {
      favorite: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(3),
        groupBy: jest.fn().mockResolvedValue([{ productId: 'p1', _count: { _all: 2 } }]),
      },
      product: { findFirst: jest.fn() },
      business: { findFirst: jest.fn() },
    };
    service = new FavoritesService(prisma);
  });

  it('adds a favorite for an active product, idempotently via upsert', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    const res = await service.addProduct('c1', 'p1');
    expect(res).toEqual({ favorite: true, count: 3 });
    expect(prisma.favorite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { consumerProfileId_productId: { consumerProfileId: 'c1', productId: 'p1' } } }),
    );
  });

  it('rejects hidden/missing products', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(service.addProduct('c1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.favorite.upsert).not.toHaveBeenCalled();
  });

  it('rejects inactive businesses', async () => {
    prisma.business.findFirst.mockResolvedValue(null);
    await expect(service.addBusiness('c1', 'b1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removal only touches the caller\'s own rows', async () => {
    await service.removeProduct('c1', 'p1');
    expect(prisma.favorite.deleteMany).toHaveBeenCalledWith({ where: { consumerProfileId: 'c1', productId: 'p1' } });
  });

  it('splits ids by target type', async () => {
    prisma.favorite.findMany.mockResolvedValue([{ productId: 'p1', businessId: null }, { productId: null, businessId: 'b1' }]);
    expect(await service.listIds('c1')).toEqual({ productIds: ['p1'], businessIds: ['b1'] });
  });

  it('returns like counts per product', async () => {
    const m = await service.countsForProducts(['p1', 'p2']);
    expect(m.get('p1')).toBe(2);
    expect(m.get('p2')).toBeUndefined();
    expect((await service.countsForProducts([])).size).toBe(0);
  });
});
