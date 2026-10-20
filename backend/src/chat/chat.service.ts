import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BusinessStatus, ChatReportStatus, NotificationType, Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { EmployeesService } from '../employees/employees.service';
import { MediaService } from '../media/media.service';
import { MAX_CHAT_ATTACHMENT_BYTES } from '../media/image-validation';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_CHAT_MESSAGE_LENGTH, ReportChatDto } from './dto/chat.dto';

type Side = 'consumer' | 'business';
const MESSAGE_PAGE = 200;
/** Chat history older than this is removed by the retention job. */
export const CHAT_RETENTION_MONTHS = 12;

/**
 * Chat between a consumer and a shop. Only the two participants (the consumer
 * who owns the conversation and the owner of the business) can read or write.
 * Admins are intentionally NOT participants; they only see what is reported to them.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly media: MediaService,
    private readonly employees: EmployeesService,
  ) {}

  /** Consumer opens (or re-opens) the one conversation they have with a shop. */
  async start(user: AuthUser, businessId: string) {
    if (user.role !== UserRole.CONSUMER || !user.profileId) {
      throw new ForbiddenException('Alleen klanten kunnen een gesprek starten');
    }
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
      throw new NotFoundException('Winkel niet gevonden');
    }
    const conversation = await this.prisma.conversation.upsert({
      where: { consumerProfileId_businessId: { consumerProfileId: user.profileId, businessId } },
      create: { consumerProfileId: user.profileId, businessId },
      update: {},
    });
    return { id: conversation.id };
  }

  /** Own conversations; with `businessId` the shop's conversations for its owner or an active employee. */
  async list(user: AuthUser, businessId?: string) {
    const where = await this.participantFilter(user, businessId);
    const viewerIsConsumer = !businessId && user.role === UserRole.CONSUMER;
    const rows = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        business: { select: { id: true, name: true } },
        consumerProfile: { select: { displayName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { readAt: null, fromBusiness: viewerIsConsumer } } } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      businessId: c.business.id,
      businessName: c.business.name,
      consumerName: c.consumerProfile.displayName,
      lastMessage: c.messages[0]
        ? {
            body: c.messages[0].body,
            hasAttachment: !!c.messages[0].attachmentAssetId,
            createdAt: c.messages[0].createdAt,
            mine: c.messages[0].fromBusiness !== viewerIsConsumer,
          }
        : null,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c._count.messages,
      blocked: !!(c.consumerBlockedAt || c.businessBlockedAt),
    }));
  }

  async messages(user: AuthUser, conversationId: string) {
    const { conversation, side } = await this.assertParticipant(user, conversationId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE,
      include: { attachment: { select: { url: true } } },
    });
    return {
      conversation: {
        id: conversation.id,
        businessName: conversation.business.name,
        consumerName: conversation.consumerProfile.displayName,
        viewerSide: side,
        blocked: !!(conversation.consumerBlockedAt || conversation.businessBlockedAt),
        blockedByMe: !!(side === 'consumer' ? conversation.consumerBlockedAt : conversation.businessBlockedAt),
      },
      messages: [...rows].reverse().map((m) => this.toDto(m, side)),
    };
  }

  async send(user: AuthUser, conversationId: string, rawBody: string) {
    const body = (rawBody ?? '').trim();
    if (!body) throw new BadRequestException('Bericht mag niet leeg zijn');
    if (body.length > MAX_CHAT_MESSAGE_LENGTH) throw new BadRequestException('Bericht is te lang');
    const { conversation, side } = await this.assertParticipant(user, conversationId);
    this.assertNotBlocked(conversation);
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({ data: { conversationId, senderUserId: user.id, body, fromBusiness: side === 'business' } }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
    await this.notifyRecipient(side, conversation, body);
    return this.toDto({ ...message, attachment: null }, side);
  }

  /** Sends an image (max 10 MB, real type checked by magic bytes) with an optional caption. */
  async sendImage(
    user: AuthUser,
    conversationId: string,
    file: { buffer: Buffer; size: number } | undefined,
    rawCaption?: string,
  ) {
    const caption = (rawCaption ?? '').trim();
    if (caption.length > MAX_CHAT_MESSAGE_LENGTH) throw new BadRequestException('Bericht is te lang');
    const { conversation, side } = await this.assertParticipant(user, conversationId);
    this.assertNotBlocked(conversation);
    const asset = await this.media.uploadImage(file, user, {
      maxBytes: MAX_CHAT_ATTACHMENT_BYTES,
      folder: `localspotter/chat/${conversationId}`,
    });
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { conversationId, senderUserId: user.id, body: caption, attachmentAssetId: asset.id, fromBusiness: side === 'business' },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
    await this.notifyRecipient(side, conversation, caption || '📷');
    return this.toDto({ ...message, attachment: { url: asset.url } }, side);
  }

  /** Marks the messages sent by the other party as read. */
  async markRead(user: AuthUser, conversationId: string) {
    const { side } = await this.assertParticipant(user, conversationId);
    const res = await this.prisma.chatMessage.updateMany({
      where: { conversationId, readAt: null, fromBusiness: side === 'consumer' },
      data: { readAt: new Date() },
    });
    // Reading re-arms the notification for the next unread burst.
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: side === 'consumer' ? { consumerNotifiedAt: null } : { businessNotifiedAt: null },
    });
    return { updated: res.count };
  }

  async unreadCount(user: AuthUser) {
    const where = await this.participantFilter(user);
    const count = await this.prisma.chatMessage.count({
      where: { readAt: null, fromBusiness: user.role === UserRole.CONSUMER, conversation: where },
    });
    return { unreadCount: count };
  }

  /** Blocks (or lifts the caller's own block on) a conversation. While blocked nobody can send. */
  async setBlocked(user: AuthUser, conversationId: string, blocked: boolean) {
    const { side } = await this.assertParticipant(user, conversationId);
    const key = side === 'consumer' ? 'consumerBlockedAt' : 'businessBlockedAt';
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { [key]: blocked ? new Date() : null },
    });
    return { blocked };
  }

  /** A participant reports a message (or the other party) to the moderators. Idempotent per message. */
  async report(user: AuthUser, conversationId: string, dto: ReportChatDto) {
    const { conversation, side } = await this.assertParticipant(user, conversationId);
    let snapshot: string | null = null;
    let reportedUserId: string | null = this.otherPartyUserId(side, conversation);
    if (dto.messageId) {
      const message = await this.prisma.chatMessage.findFirst({
        where: { id: dto.messageId, conversationId },
        select: { id: true, body: true, senderUserId: true, fromBusiness: true, attachmentAssetId: true },
      });
      if (!message) throw new NotFoundException('Bericht niet gevonden');
      if (message.fromBusiness === (side === 'business')) throw new BadRequestException('Je kunt je eigen bericht niet melden');
      snapshot = message.body || (message.attachmentAssetId ? '[afbeelding]' : '');
      reportedUserId = message.senderUserId;
      const existing = await this.prisma.chatReport.findFirst({
        where: { reporterUserId: user.id, messageId: dto.messageId },
        select: { id: true },
      });
      if (existing) return { id: existing.id, alreadyReported: true };
    }
    const created = await this.prisma.chatReport.create({
      data: {
        conversationId,
        messageId: dto.messageId ?? null,
        reporterUserId: user.id,
        reportedUserId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
        messageSnapshot: snapshot,
      },
    });
    return { id: created.id, alreadyReported: false };
  }

  // ---------------- moderation (admin) ----------------

  async listReports(status: ChatReportStatus = ChatReportStatus.OPEN) {
    const rows = await this.prisma.chatReport.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        reporter: { select: { id: true, email: true } },
        conversation: {
          select: { id: true, business: { select: { id: true, name: true } }, consumerProfile: { select: { displayName: true } } },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      details: r.details,
      messageSnapshot: r.messageSnapshot,
      createdAt: r.createdAt,
      reporterEmail: r.reporter.email,
      businessName: r.conversation.business.name,
      consumerName: r.conversation.consumerProfile.displayName,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt,
    }));
  }

  async resolveReport(adminUserId: string, reportId: string, status: 'RESOLVED' | 'DISMISSED', note?: string) {
    const report = await this.prisma.chatReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Melding niet gevonden');
    if (report.status !== ChatReportStatus.OPEN) throw new BadRequestException('Deze melding is al afgehandeld');
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.chatReport.update({
        where: { id: reportId },
        data: { status, resolutionNote: note?.trim() || null, resolvedByUserId: adminUserId, resolvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: `CHAT_REPORT_${status}`,
          targetType: 'ChatReport',
          targetId: reportId,
          metadata: { reason: report.reason } as Prisma.InputJsonValue,
        },
      });
      return u;
    });
    return { id: updated.id, status: updated.status };
  }

  // ---------------- retention ----------------

  /**
   * Deletes chat messages older than the retention period, except those with an open report.
   * Conversations left without messages and idle for the whole period are removed too.
   * Image files already uploaded to Cloudinary are NOT deleted (the storage adapter has no delete).
   */
  async purgeExpired(now = new Date(), months = CHAT_RETENTION_MONTHS) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    const messages = await this.prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: cutoff }, reports: { none: { status: ChatReportStatus.OPEN } } },
    });
    const conversations = await this.prisma.conversation.deleteMany({
      where: { lastMessageAt: { lt: cutoff }, messages: { none: {} }, reports: { none: { status: ChatReportStatus.OPEN } } },
    });
    this.logger.log(`Chat retention: removed ${messages.count} messages, ${conversations.count} conversations`);
    return { messagesDeleted: messages.count, conversationsDeleted: conversations.count, cutoff };
  }

  // ---------------- helpers ----------------

  private toDto(
    m: { id: string; body: string; createdAt: Date; readAt: Date | null; fromBusiness: boolean; attachment?: { url: string } | null },
    side: Side,
  ) {
    return {
      id: m.id,
      body: m.body,
      attachmentUrl: m.attachment?.url ?? null,
      createdAt: m.createdAt,
      readAt: m.readAt,
      mine: m.fromBusiness === (side === 'business'),
    };
  }

  private assertNotBlocked(c: { consumerBlockedAt?: Date | null; businessBlockedAt?: Date | null }) {
    if (c.consumerBlockedAt || c.businessBlockedAt) {
      throw new ForbiddenException('Dit gesprek is geblokkeerd');
    }
  }

  private otherPartyUserId(side: Side, c: any): string | null {
    return side === 'consumer' ? (c.business?.ownerProfile?.userId ?? null) : (c.consumerProfile?.userId ?? null);
  }

  /**
   * One in-app + e-mail notification per unread burst: the first message after the recipient last
   * read the thread. The claim is atomic so two quick messages do not notify twice. Never throws.
   * Messages from the consumer notify the shop owner; employees see them in the shop inbox.
   */
  private async notifyRecipient(senderSide: Side, conversation: any, preview: string) {
    try {
      const toConsumer = senderSide === 'business';
      const recipientUserId = this.otherPartyUserId(senderSide, conversation);
      if (!recipientUserId) return;
      const notifiedField = toConsumer ? 'consumerNotifiedAt' : 'businessNotifiedAt';
      const claim = await this.prisma.conversation.updateMany({
        where: { id: conversation.id, [notifiedField]: null },
        data: { [notifiedField]: new Date() },
      });
      if (claim.count !== 1) return;
      const from = toConsumer ? conversation.business.name : conversation.consumerProfile.displayName;
      await this.notifications.notifyUser(
        recipientUserId,
        NotificationType.CHAT,
        `Nieuw bericht van ${from}`,
        preview.length > 140 ? `${preview.slice(0, 137)}...` : preview,
        { linkUrl: `/chat/${conversation.id}`, email: true },
      );
    } catch (err) {
      this.logger.warn(`Chat notification failed: ${(err as Error).message}`);
    }
  }

  private async participantFilter(user: AuthUser, businessId?: string) {
    if (businessId) {
      // Shop inbox: the owner or an active employee of exactly this shop.
      if (!(await this.employees.canAccessShop(user, businessId))) throw new ForbiddenException('Geen toegang tot chat');
      return { businessId };
    }
    if (user.role === UserRole.CONSUMER && user.profileId) return { consumerProfileId: user.profileId };
    if (user.role === UserRole.BUSINESS_OWNER && user.profileId) return { business: { ownerProfileId: user.profileId } };
    throw new ForbiddenException('Geen toegang tot chat');
  }

  private async assertParticipant(user: AuthUser, conversationId: string): Promise<{ conversation: any; side: Side }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        business: { select: { name: true, ownerProfileId: true, ownerProfile: { select: { userId: true } } } },
        consumerProfile: { select: { displayName: true, userId: true } },
      },
    });
    // Same 404 for "missing" and "not yours" so ids cannot be probed.
    if (!conversation) throw new NotFoundException('Gesprek niet gevonden');
    const isConsumer = user.role === UserRole.CONSUMER && !!user.profileId && conversation.consumerProfileId === user.profileId;
    if (isConsumer) return { conversation, side: 'consumer' };
    const isOwner = user.role === UserRole.BUSINESS_OWNER && !!user.profileId && conversation.business.ownerProfileId === user.profileId;
    if (isOwner) return { conversation, side: 'business' };
    if (await this.employees.isActiveStaff(user.id, conversation.businessId)) return { conversation, side: 'business' };
    throw new NotFoundException('Gesprek niet gevonden');
  }
}
