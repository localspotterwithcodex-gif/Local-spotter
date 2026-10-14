import { ForbiddenException } from '@nestjs/common';
import { BusinessStatus, UserRole } from '@prisma/client';
import { BusinessesService } from './businesses.service';

function make(status: BusinessStatus) {
  const business = { id: 'b1', status, ownerProfileId: 'op-1', deletedAt: null };
  const prisma = {
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'op-1', userId: 'owner-1' }) },
    business: {
      findUnique: jest.fn().mockResolvedValue(business),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'b1', ...data })),
    },
  };
  return { service: new BusinessesService(prisma as never, { translateFields: jest.fn().mockResolvedValue({ sourceLocale: null, translations: null }) } as never), prisma };
}
const owner = { id: 'owner-1', role: UserRole.BUSINESS_OWNER };
const admin = { id: 'admin-1', role: UserRole.SUPER_ADMIN };

describe('BusinessesService.updateStatus', () => {
  it('lets an owner move their own business between DRAFT and PENDING_APPROVAL', async () => {
    const { service, prisma } = make(BusinessStatus.DRAFT);
    await service.updateStatus('b1', owner, { status: BusinessStatus.PENDING_APPROVAL });
    expect(prisma.business.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: BusinessStatus.PENDING_APPROVAL } });
  });

  it('never lets an owner activate their own business', async () => {
    const { service, prisma } = make(BusinessStatus.PENDING_APPROVAL);
    await expect(service.updateStatus('b1', owner, { status: BusinessStatus.ACTIVE })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it.each([BusinessStatus.SUSPENDED, BusinessStatus.DISABLED])('owner cannot lift an admin %s block', async (blocked) => {
    const { service, prisma } = make(blocked);
    await expect(service.updateStatus('b1', owner, { status: BusinessStatus.DRAFT })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it('lets a super admin set any status, including lifting a suspension', async () => {
    const { service, prisma } = make(BusinessStatus.SUSPENDED);
    await service.updateStatus('b1', admin, { status: BusinessStatus.ACTIVE });
    expect(prisma.business.update).toHaveBeenCalled();
  });
});
