import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface Mapped {
  status: number;
  code: string;
  message: string;
}

/**
 * Database errors that are the caller's doing (duplicate, missing row, bad reference) become proper 4xx
 * answers instead of a bare 500, and the ones that are ours (schema out of date, invalid query) are logged
 * with the Prisma code so the cause is visible in the server log. Nothing from the database is sent to the client.
 */
export function mapPrismaError(err: unknown): Mapped | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, code: 'DUPLICATE', message: 'Already exists' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, code: 'INVALID_REFERENCE', message: 'Referenced item does not exist' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND', message: 'Not found' };
      default:
        return null;
    }
  }
  return null;
}

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError, Prisma.PrismaClientInitializationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(err: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse();
    const req = http.getRequest();
    const mapped = mapPrismaError(err);
    const where = `${req?.method ?? ''} ${req?.url?.split('?')[0] ?? ''}`.trim();

    if (mapped) {
      // Expected: caller error. Log at warn level with the Prisma code, never the data.
      this.logger.warn(`${where} -> ${mapped.status} ${(err as Prisma.PrismaClientKnownRequestError).code} ${(err as Prisma.PrismaClientKnownRequestError).meta ? JSON.stringify((err as Prisma.PrismaClientKnownRequestError).meta) : ''}`.trim());
      res.status(mapped.status).json({ statusCode: mapped.status, code: mapped.code, message: mapped.message });
      return;
    }

    const prismaCode = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : err instanceof Prisma.PrismaClientValidationError ? 'VALIDATION' : 'INIT';
    const hint =
      prismaCode === 'P2021' || prismaCode === 'P2022'
        ? ' (the database is behind the code: run `npx prisma migrate deploy`)'
        : '';
    // Message only (first lines): Prisma validation text names the offending field but holds no secrets.
    this.logger.error(`${where} -> 500 ${prismaCode}${hint} ${String((err as Error).message).split('\n').slice(-4).join(' ').slice(0, 400)}`);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Internal server error' });
  }
}
