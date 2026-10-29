import { Prisma } from '@prisma/client';
import { mapPrismaError } from './prisma-exception.filter';

const known = (code: string) => new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('mapPrismaError', () => {
  it('turns caller-side database errors into 4xx answers', () => {
    expect(mapPrismaError(known('P2002'))).toMatchObject({ status: 409, code: 'DUPLICATE' });
    expect(mapPrismaError(known('P2003'))).toMatchObject({ status: 400, code: 'INVALID_REFERENCE' });
    expect(mapPrismaError(known('P2025'))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('leaves server-side errors (schema drift, invalid query) unmapped so they are logged as 500', () => {
    expect(mapPrismaError(known('P2022'))).toBeNull();
    expect(mapPrismaError(new Error('boom'))).toBeNull();
  });
});
