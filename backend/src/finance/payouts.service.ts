import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, PayoutStatus, Prisma } from '@prisma/client';
import { decryptSecret, parseEncryptionKey } from '../common/crypto/secret-box';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { availableBalanceCents } from './balance';
import { DEFAULT_PAYOUT_MIN_CENTS, LEDGER, isoWeekKey } from './ledger';

export interface WeeklyRunResult {
  periodKey: string;
  created: number;
  alreadyExists: number;
  belowMinimum: number;
  failed: number;
}

type CreateOutcome = { kind: 'CREATED'; payoutId: string; amountCents: number } | { kind: 'EXISTS' } | { kind: 'BELOW_MINIMUM' };

const OPEN_STATUSES: PayoutStatus[] = [PayoutStatus.PENDING, PayoutStatus.APPROVED];

const eur = (cents: number) => `€${(cents / 100).toFixed(2).replace('.', ',')}`;

/** Spreadsheet formula injection guard + CSV quoting. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Weekly payouts. The platform collects every payment (Stripe), so a payout is a ledger movement
 * followed by a bank transfer that an administrator makes (the payment provider cannot pay arbitrary IBANs).
 * Flow: weekly run -> PENDING payout (+ PAYOUT ledger debit) -> admin exports the IBAN list, transfers,
 * marks PAID. A rejected or failed payout is credited back (PAYOUT_REVERSAL).
 */
@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private minCents(): number {
    const raw = Number(this.config.get<string>('PAYOUT_MIN_CENTS'));
    return Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_PAYOUT_MIN_CENTS;
  }

  /** Idempotent per (business, ISO week): running it twice in a week creates nothing new. */
  async runWeekly(now: Date = new Date()): Promise<WeeklyRunResult> {
    const periodKey = isoWeekKey(now);
    const result: WeeklyRunResult = { periodKey, created: 0, alreadyExists: 0, belowMinimum: 0, failed: 0 };

    const accounts = await this.prisma.payoutAccount.findMany({
      where: { ibanEncrypted: { not: null }, business: { deletedAt: null } },
      select: { businessId: true, accountHolderName: true, ibanEncrypted: true },
    });

    for (const account of accounts) {
      try {
        const outcome = await this.createForBusiness(account, periodKey, now);
        if (outcome.kind === 'CREATED') {
          result.created += 1;
          await this.notifyOwner(account.businessId, 'Uitbetaling aangemaakt', `Je uitbetaling van ${eur(outcome.amountCents)} is aangemaakt en wordt binnenkort overgemaakt.`);
        } else if (outcome.kind === 'EXISTS') result.alreadyExists += 1;
        else result.belowMinimum += 1;
      } catch (err) {
        result.failed += 1;
        this.logger.error(`Weekly payout failed for business ${account.businessId}: ${(err as Error).message}`);
      }
    }
    return result;
  }

  private async createForBusiness(
    account: { businessId: string; accountHolderName: string | null; ibanEncrypted: string | null },
    periodKey: string,
    now: Date,
  ): Promise<CreateOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // Serialises concurrent runs for the same business; the unique (business, period) key is the second guard.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${account.businessId}))`;
      const existing = await tx.payout.findUnique({ where: { businessId_periodKey: { businessId: account.businessId, periodKey } } });
      if (existing) return { kind: 'EXISTS' } as const;

      const amountCents = await availableBalanceCents(tx, account.businessId, now);
      if (amountCents <= 0 || amountCents < this.minCents()) return { kind: 'BELOW_MINIMUM' } as const;

      const payout = await tx.payout.create({
        data: {
          businessId: account.businessId,
          amount: (amountCents / 100).toFixed(2),
          currency: 'EUR',
          status: PayoutStatus.PENDING,
          accountHolder: account.accountHolderName,
          ibanEncrypted: account.ibanEncrypted,
          periodKey,
          requestedAt: now,
        },
      });
      await tx.businessLedgerEntry.create({
        data: { businessId: account.businessId, payoutId: payout.id, type: LEDGER.PAYOUT, amountCents: -amountCents, currency: 'EUR' },
      });
      return { kind: 'CREATED', payoutId: payout.id, amountCents } as const;
    });
  }

  async markPaid(payoutId: string, adminId: string, providerReference: string) {
    const payout = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.payout.updateMany({
        where: { id: payoutId, status: { in: OPEN_STATUSES } },
        data: { status: PayoutStatus.PAID, paidAt: new Date(), providerReference, approvedByUserId: adminId },
      });
      if (moved.count === 0) await this.explainNoTransition(tx, payoutId);
      await tx.auditLog.create({
        data: { actorUserId: adminId, action: 'PAYOUT_MARKED_PAID', targetType: 'PAYOUT', targetId: payoutId, metadata: { providerReference } },
      });
      return tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    });
    await this.notifyOwner(payout.businessId, 'Uitbetaling verstuurd', `Je uitbetaling van ${eur(Math.round(Number(payout.amount.toString()) * 100))} is overgemaakt.`);
    return { id: payout.id, status: payout.status };
  }

  /** Rejects or fails an open payout and credits the money back to the business balance. */
  async fail(payoutId: string, adminId: string, status: 'REJECTED' | 'FAILED', reason: string) {
    const payout = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.payout.updateMany({
        where: { id: payoutId, status: { in: OPEN_STATUSES } },
        data: { status, adminNotes: reason, rejectedReason: reason, approvedByUserId: adminId },
      });
      if (moved.count === 0) await this.explainNoTransition(tx, payoutId);

      const debit = await tx.businessLedgerEntry.findFirst({ where: { payoutId, type: LEDGER.PAYOUT } });
      if (debit) {
        const reversed = await tx.businessLedgerEntry.findFirst({ where: { payoutId, type: LEDGER.PAYOUT_REVERSAL } });
        if (!reversed) {
          await tx.businessLedgerEntry.create({
            data: { businessId: debit.businessId, payoutId, type: LEDGER.PAYOUT_REVERSAL, amountCents: Math.abs(debit.amountCents), currency: debit.currency },
          });
        }
      }
      await tx.auditLog.create({
        data: { actorUserId: adminId, action: `PAYOUT_${status}`, targetType: 'PAYOUT', targetId: payoutId, metadata: { reason } },
      });
      return tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    });
    await this.notifyOwner(
      payout.businessId,
      status === 'REJECTED' ? 'Uitbetaling afgewezen' : 'Uitbetaling mislukt',
      `Je uitbetaling is niet uitgevoerd: ${reason}. Het bedrag staat weer in je saldo.`,
    );
    return { id: payout.id, status: payout.status };
  }

  /** CSV of open payouts with decrypted IBANs for the administrator's bank batch. Audited. */
  async exportOpenPayouts(adminId: string): Promise<{ csv: string; rows: number; skipped: number }> {
    const key = parseEncryptionKey(this.config.get<string>('ENCRYPTION_KEY'));
    if (!key) throw new ServiceUnavailableException('ENCRYPTION_KEY is not configured; IBANs cannot be decrypted');

    const payouts = await this.prisma.payout.findMany({
      where: { status: { in: OPEN_STATUSES }, ibanEncrypted: { not: null } },
      orderBy: { createdAt: 'asc' },
      include: { business: { select: { name: true } } },
    });

    const lines = [['payout_id', 'business', 'account_holder', 'iban', 'amount', 'currency', 'reference'].join(',')];
    let skipped = 0;
    for (const p of payouts) {
      try {
        const iban = decryptSecret(p.ibanEncrypted as string, key);
        lines.push(
          [p.id, p.business.name, p.accountHolder ?? p.business.name, iban, p.amount.toString(), p.currency, `LocalSpotter ${p.periodKey ?? p.id.slice(0, 8)}`]
            .map(csvCell)
            .join(','),
        );
      } catch {
        skipped += 1; // wrong key or tampered value: never export a guess
      }
    }
    await this.prisma.auditLog.create({
      data: { actorUserId: adminId, action: 'PAYOUT_EXPORTED', targetType: 'PAYOUT', metadata: { rows: lines.length - 1, skipped } },
    });
    return { csv: lines.join('\n') + '\n', rows: lines.length - 1, skipped };
  }

  private async explainNoTransition(tx: Prisma.TransactionClient, payoutId: string): Promise<never> {
    const current = await tx.payout.findUnique({ where: { id: payoutId }, select: { status: true } });
    if (!current) throw new NotFoundException('Payout not found');
    throw new ConflictException(`Payout is ${current.status} and can no longer be changed`);
  }

  private async notifyOwner(businessId: string, title: string, message: string): Promise<void> {
    try {
      const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { ownerProfile: { select: { userId: true } } } });
      const userId = business?.ownerProfile?.userId;
      if (userId) await this.notifications.notifyUser(userId, NotificationType.PAYOUT, title, message, { linkUrl: '/owner/payouts', email: true });
    } catch (err) {
      this.logger.warn(`Payout notification failed: ${(err as Error).message}`);
    }
  }
}
