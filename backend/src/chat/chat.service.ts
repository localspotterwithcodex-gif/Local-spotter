import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_CHAT_MESSAGE_LENGTH } from './dto/chat.dto';

const MESSAGE_PAGE = 200;

/**
 * Chat between a consumer and a shop. Only the two participants (the consumer
 * who owns the conversation and the owner of the business) can read or write.
 * Admins are intentionally NOT participants.
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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

  async list(user: AuthUser) {
    const where = await this.participantFilter(user);
    const rows = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      include: {
        business: { select: { id: true, name: true } },
        consumerProfile: { select: { displayName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { readAt: null, senderUserId: { not: user.id } } } } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      businessId: c.business.id,
      businessName: c.business.name,
      consumerName: c.consumerProfile.displayName,
      lastMessage: c.messages[0] ? { body: c.messages[0].body, createdAt: c.messages[0].createdAt, mine: c.messages[0].senderUserId === user.id } : null,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c._count.messages,
    }));
  }

  async messages(user: AuthUser, conversationId: string) {
    const conversation = await this.assertParticipant(user, conversationId);
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_PAGE,
    });
    return {
      conversation: {
        id: conversation.id,
        businessName: conversation.business.name,
        consumerName: conversation.consumerProfile.displayName,
      },
      messages: [...rows].reverse().map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, readAt: m.readAt, mine: m.senderUserId === user.id })),
    };
  }

  async send(user: AuthUser, conversationId: string, rawBody: string) {
    const body = (rawBody ?? '').trim();
    if (!body) throw new BadRequestException('Bericht mag niet leeg zijn');
    if (body.length > MAX_CHAT_MESSAGE_LENGTH) throw new BadRequestException('Bericht is te lang');
    await this.assertParticipant(user, conversationId);
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({ data: { conversationId, senderUserId: user.id, body } }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);
    return { id: message.id, body: message.body, createdAt: message.createdAt, readAt: message.readAt, mine: true };
  }

  /** Marks the messages sent by the other party as read. */
  async markRead(user: AuthUser, conversationId: string) {
    await this.assertParticipant(user, conversationId);
    const res = await this.prisma.chatMessage.updateMany({
      where: { conversationId, readAt: null, senderUserId: { not: user.id } },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  async unreadCount(user: AuthUser) {
    const where = await this.participantFilter(user);
    const count = await this.prisma.chatMessage.count({
      where: { readAt: null, senderUserId: { not: user.id }, conversation: where },
    });
    return { unreadCount: count };
  }

  private async participantFilter(user: AuthUser) {
    if (user.role === UserRole.CONSUMER && user.profileId) return { consumerProfileId: user.profileId };
    if (user.role === UserRole.BUSINESS_OWNER && user.profileId) return { business: { ownerProfileId: user.profileId } };
    throw new ForbiddenException('Geen toegang tot chat');
  }

  private async assertParticipant(user: AuthUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { business: { select: { name: true, ownerProfileId: true } }, consumerProfile: { select: { displayName: true } } },
    });
    // Same 404 for "missing" and "not yours" so ids cannot be probed.
    if (!conversation) throw new NotFoundException('Gesprek niet gevonden');
    const isConsumer = user.role === UserRole.CONSUMER && !!user.profileId && conversation.consumerProfileId === user.profileId;
    const isOwner = user.role === UserRole.BUSINESS_OWNER && !!user.profileId && conversation.business.ownerProfileId === user.profileId;
    if (!isConsumer && !isOwner) throw new NotFoundException('Gesprek niet gevonden');
    return conversation;
  }
}
