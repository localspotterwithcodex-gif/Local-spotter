import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../common/types/auth-user';
import { encryptSecret, parseEncryptionKey } from '../common/crypto/secret-box';
import { isValidIban, normalizeIban } from '../common/iban';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPayoutAccountDto } from './dto/payout.dto';

export interface PayoutAccountView {
  configured: boolean;
  accountHolderName: string | null;
  ibanMasked: string | null;
}

/** Owner-only: the bank account the weekly payout is sent to. The IBAN is encrypted at rest and never returned in full. */
@Injectable()
export class PayoutAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get(businessId: string, user: AuthUser): Promise<PayoutAccountView> {
    await this.assertOwner(businessId, user);
    const account = await this.prisma.payoutAccount.findUnique({ where: { businessId } });
    if (!account?.ibanEncrypted) return { configured: false, accountHolderName: account?.accountHolderName ?? null, ibanMasked: null };
    return { configured: true, accountHolderName: account.accountHolderName, ibanMasked: account.ibanLast4 ? `•••• ${account.ibanLast4}` : null };
  }

  async upsert(businessId: string, user: AuthUser, dto: UpsertPayoutAccountDto): Promise<PayoutAccountView> {
    await this.assertOwner(businessId, user);
    const key = parseEncryptionKey(this.config.get<string>('ENCRYPTION_KEY'));
    if (!key) throw new ServiceUnavailableException('Bankgegevens kunnen nu niet worden opgeslagen');

    const iban = normalizeIban(dto.iban);
    if (!isValidIban(iban)) throw new BadRequestException('Ongeldig IBAN');

    const data = {
      accountHolderName: dto.accountHolderName.trim(),
      ibanEncrypted: encryptSecret(iban, key),
      ibanLast4: iban.slice(-4),
    };
    await this.prisma.$transaction([
      this.prisma.payoutAccount.upsert({ where: { businessId }, create: { businessId, ...data }, update: data }),
      // The audit entry never contains the IBAN.
      this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'PAYOUT_ACCOUNT_UPDATED', targetType: 'BUSINESS', targetId: businessId, metadata: { last4: data.ibanLast4 } } }),
    ]);
    return { configured: true, accountHolderName: data.accountHolderName, ibanMasked: `•••• ${data.ibanLast4}` };
  }

  private async assertOwner(businessId: string, user: AuthUser) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    const owner = await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } });
    if (!owner || business.ownerProfileId !== owner.id) throw new ForbiddenException('Alleen de eigenaar beheert de bankgegevens');
  }
}
