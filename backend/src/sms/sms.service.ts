import { Inject, Injectable, Logger } from '@nestjs/common';
import { SmsPurpose, SmsStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_SENDER, SmsCategory, SmsSendError, SmsSender } from './sms-sender';

export const phoneLast4 = (e164: string) => e164.replace(/\D/g, '').slice(-4);

/** Sends SMS through the configured provider and records each one in sms_messages (no text, last 4 digits only). */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_SENDER) private readonly sender: SmsSender,
  ) {}

  isConfigured(): boolean {
    return this.sender.isConfigured();
  }

  get provider(): string {
    return this.sender.provider;
  }

  /**
   * Sends one logical message. A message whose idempotency key was already SENT is not sent again.
   * Returns false (never throws) when delivery failed; the row then says FAILED with the error code.
   */
  async send(m: { purpose: SmsPurpose; to: string; text: string; category: SmsCategory; idempotencyKey: string; userId?: string | null; orderId?: string | null }): Promise<boolean> {
    const row = await this.prisma.smsMessage.upsert({
      where: { idempotencyKey: m.idempotencyKey },
      create: { purpose: m.purpose, idempotencyKey: m.idempotencyKey, phoneLast4: phoneLast4(m.to), provider: this.sender.provider, userId: m.userId ?? null, orderId: m.orderId ?? null },
      update: {},
    });
    return this.deliver(row.id, m.to, m.text, m.category);
  }

  /** Delivers a message row created earlier (e.g. QUEUED inside an order status transaction). */
  async deliver(messageId: string, to: string, text: string, category: SmsCategory): Promise<boolean> {
    const row = await this.prisma.smsMessage.findUnique({ where: { id: messageId } });
    if (!row || row.status === SmsStatus.SENT || row.status === SmsStatus.DELIVERED) return !!row;
    try {
      const { providerMessageId } = await this.sender.send({ to, text, category, idempotencyKey: row.idempotencyKey });
      await this.prisma.smsMessage.update({ where: { id: row.id }, data: { status: SmsStatus.SENT, providerMessageId, provider: this.sender.provider, errorCode: null } });
      return true;
    } catch (err) {
      const code = err instanceof SmsSendError ? err.code : 'UNKNOWN';
      this.logger.warn(`SMS ${row.purpose} not sent (${code})`);
      await this.prisma.smsMessage.update({ where: { id: row.id }, data: { status: SmsStatus.FAILED, errorCode: code } });
      return false;
    }
  }
}
