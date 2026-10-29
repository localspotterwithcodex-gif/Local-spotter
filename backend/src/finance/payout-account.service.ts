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

    const { stored, last4 } = this.buildAccountReference(dto);

    const data = {
      accountHolderName: dto.accountHolderName.trim(),
      ibanEncrypted: encryptSecret(stored, key),
      ibanLast4: last4,
    };
    await this.prisma.$transaction([
      this.prisma.payoutAccount.upsert({ where: { businessId }, create: { businessId, ...data }, update: data }),
      // The audit entry never contains the IBAN.
      this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'PAYOUT_ACCOUNT_UPDATED', targetType: 'BUSINESS', targetId: businessId, metadata: { last4: data.ibanLast4 } } }),
    ]);
    return { configured: true, accountHolderName: data.accountHolderName, ibanMasked: `•••• ${data.ibanLast4}` };
  }

  /**
   * A valid IBAN is stored as-is. Anything else is accepted as an international account only when the bank
   * details needed for a manual transfer (bank name, BIC/SWIFT, country) are supplied. Never silently drops input.
   */
  private buildAccountReference(dto: UpsertPayoutAccountDto): { stored: string; last4: string } {
    const iban = normalizeIban(dto.iban);
    if (isValidIban(iban)) return { stored: iban, last4: iban.slice(-4) };

    const account = dto.iban.replace(/[\s-]+/g, '').toUpperCase();
    const bankName = dto.bankName?.trim();
    const bic = dto.bic?.replace(/\s+/g, '').toUpperCase();
    const country = dto.country?.trim().toUpperCase();
    // Something that looks like an IBAN (two letters + two check digits) must be a correct one: catches typos.
    if (!/^[A-Z0-9]{5,34}$/.test(account) || /^[A-Z]{2}\d{2}/.test(account)) {
      throw new BadRequestException({ code: 'IBAN_INVALID', message: 'Ongeldig rekeningnummer' });
    }
    if (!bankName || !bic || !country) {
      throw new BadRequestException({ code: 'BANK_DETAILS_REQUIRED', message: 'Bankgegevens onvolledig' });
    }
    if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic) || !/^[A-Z]{2}$/.test(country)) {
      throw new BadRequestException({ code: 'BANK_DETAILS_INVALID', message: 'BIC of land ongeldig' });
    }
    return { stored: `${account} | BIC ${bic} | ${bankName} | ${country}`, last4: account.slice(-4) };
  }

  private async assertOwner(businessId: string, user: AuthUser) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    const owner = await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } });
    if (!owner || business.ownerProfileId !== owner.id) throw new ForbiddenException('Alleen de eigenaar beheert de bankgegevens');
  }
}
