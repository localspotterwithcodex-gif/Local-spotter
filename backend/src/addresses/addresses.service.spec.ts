import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AddressesService, MAX_ADDRESSES_PER_CONSUMER } from './addresses.service';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'a1', consumerProfileId: 'p1', label: 'Thuis', fullName: 'Sanne', phone: null, street: 'Kerkstraat',
  houseNumber: '1', postalCode: '1234AB', city: 'Delft', countryCode: 'NL', isDefault: false, deletedAt: null, ...over,
});
const dto = { label: 'Thuis', fullName: 'Sanne de Jong', street: 'Kerkstraat', city: 'Delft' };

describe('AddressesService', () => {
  let prisma: any;
  let service: AddressesService;

  beforeEach(() => {
    prisma = {
      consumerAddress: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    service = new AddressesService(prisma);
  });

  it('requires a consumer profile', async () => {
    await expect(service.list(undefined)).rejects.toThrow(BadRequestException);
  });

  it('lists only the caller\'s non-deleted addresses', async () => {
    await service.list('p1');
    expect(prisma.consumerAddress.findMany.mock.calls[0][0].where).toEqual({ consumerProfileId: 'p1', deletedAt: null });
  });

  it('makes the first address the default', async () => {
    const res = await service.create('p1', dto);
    expect(res.isDefault).toBe(true);
  });

  it('moves the default when a later address asks for it', async () => {
    prisma.consumerAddress.count.mockResolvedValue(2);
    const res = await service.create('p1', { ...dto, isDefault: true });
    expect(res.isDefault).toBe(true);
    expect(prisma.consumerAddress.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDefault: false } }),
    );
  });

  it('does not take over the default for a non-default address', async () => {
    prisma.consumerAddress.count.mockResolvedValue(2);
    const res = await service.create('p1', dto);
    expect(res.isDefault).toBe(false);
    expect(prisma.consumerAddress.updateMany).not.toHaveBeenCalled();
  });

  it('enforces the per-consumer limit', async () => {
    prisma.consumerAddress.count.mockResolvedValue(MAX_ADDRESSES_PER_CONSUMER);
    await expect(service.create('p1', dto)).rejects.toThrow(BadRequestException);
    expect(prisma.consumerAddress.create).not.toHaveBeenCalled();
  });

  it('cannot update or delete another consumer\'s address (scoped lookup, 404)', async () => {
    prisma.consumerAddress.findFirst.mockResolvedValue(null);
    await expect(service.update('p1', 'a-other', { city: 'X' })).rejects.toThrow(NotFoundException);
    await expect(service.remove('p1', 'a-other')).rejects.toThrow(NotFoundException);
    expect(prisma.consumerAddress.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'a-other', consumerProfileId: 'p1' });
    expect(prisma.consumerAddress.update).not.toHaveBeenCalled();
  });

  it('keeps the default when only other fields are updated', async () => {
    prisma.consumerAddress.findFirst.mockResolvedValue(row({ isDefault: true }));
    const res = await service.update('p1', 'a1', { city: 'Utrecht' });
    expect(res.isDefault).toBe(true);
  });

  it('soft-deletes and promotes another address when the default is removed', async () => {
    prisma.consumerAddress.findFirst
      .mockResolvedValueOnce(row({ id: 'a1', isDefault: true }))
      .mockResolvedValueOnce(row({ id: 'a2' }));
    await service.remove('p1', 'a1');
    expect(prisma.consumerAddress.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.consumerAddress.update.mock.calls[1][0]).toEqual({ where: { id: 'a2' }, data: { isDefault: true } });
  });
});
