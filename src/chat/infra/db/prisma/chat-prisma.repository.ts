import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { AuthUser } from '../../../../auth/auth-user';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  personSearch,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  ChatAttachmentRecord,
  ChatMessageView,
  CreateConversationCommand,
  IChatRepository,
  SendMessageCommand,
} from '../../../domain/chat.repository';

const PARTICIPANT_INCLUDE = {
  Person: {
    where: { deletedAt: null },
    select: { firstName: true, lastName: true },
    take: 1,
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class ChatPrismaRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async unreadCount(user: AuthUser) {
    const [result] = await this.prisma.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(*)::int AS "count"
        FROM "chat_messages" AS message
        INNER JOIN "chat_conversations" AS conversation
          ON conversation."id" = message."conversationId"
        WHERE conversation."branchId" = ${user.branchId}
          AND message."authorId" <> ${user.id}
          AND (
            (
              conversation."starterId" = ${user.id}
              AND (
                conversation."starterLastReadAt" IS NULL
                OR message."createdAt" > conversation."starterLastReadAt"
              )
            )
            OR (
              conversation."recipientId" = ${user.id}
              AND (
                conversation."recipientLastReadAt" IS NULL
                OR message."createdAt" > conversation."recipientLastReadAt"
              )
            )
          )
      `,
    );
    return { count: result?.count ?? 0 };
  }

  async list(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, {
      category: ['staff', 'patients', 'post-care'],
    });
    const where: Prisma.ChatConversationWhereInput = {
      branchId: user.branchId,
      OR: [{ starterId: user.id }, { recipientId: user.id }],
      ...(query.category && { category: query.category }),
      updatedAt: dateRange(query),
      ...(query.search && {
        AND: [
          {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' } },
              {
                starter: {
                  id: { not: user.id },
                  Person: { some: personSearch(query.search) },
                },
              },
              {
                recipient: {
                  id: { not: user.id },
                  Person: { some: personSearch(query.search) },
                },
              },
            ],
          },
        ],
      }),
    };
    const [conversations, total] = await this.prisma.$transaction([
      this.prisma.chatConversation.findMany({
        where,
        include: {
          starter: { include: PARTICIPANT_INCLUDE },
          recipient: { include: PARTICIPANT_INCLUDE },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { author: { include: PARTICIPANT_INCLUDE } },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.chatConversation.count({ where }),
    ]);
    // Messages are fetched newest-first so long threads keep their latest 50.
    return paginated(
      conversations.map((conversation) =>
        this.toConversation(
          { ...conversation, messages: [...conversation.messages].reverse() },
          user.id,
        ),
      ),
      total,
      query,
    );
  }

  async contacts(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, {
      role: [
        'admin',
        'doctor',
        'nurse',
        'secretary',
        'receptionist',
        'patient',
      ],
    });
    const where: Prisma.UserWhereInput = {
      branchId: user.branchId,
      id: { not: user.id },
      isActive: true,
      deletedAt: null,
      createdAt: dateRange(query),
      ...(query.role && { Role: { slug: query.role } }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { Person: { some: personSearch(query.search) } },
        ],
      }),
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { ...PARTICIPANT_INCLUDE, Role: { select: { slug: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      users.map((contact) => ({
        id: contact.id,
        name: this.userName(contact),
        email: contact.email,
        role: contact.Role?.slug ?? 'staff',
        avatar: '',
      })),
      total,
      query,
    );
  }

  async markRead(user: AuthUser, conversationId: string) {
    const conversation = await this.requireParticipant(user, conversationId);
    await this.prisma.chatConversation.update({
      where: { id: conversation.id },
      // updatedAt is bumped by Prisma, so read state is stored in its own columns.
      data:
        conversation.starterId === user.id
          ? { starterLastReadAt: new Date() }
          : { recipientLastReadAt: new Date() },
    });
    return { id: conversation.id, unreadCount: 0 };
  }

  async create(user: AuthUser, input: CreateConversationCommand) {
    if (user.id === input.recipientId) {
      throw new ForbiddenException(
        'A conversation must have another participant',
      );
    }
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: input.recipientId,
        branchId: user.branchId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!recipient)
      throw new NotFoundException('Conversation participant not found');

    const conversation = await this.prisma.chatConversation.create({
      data: {
        branchId: user.branchId,
        starterId: user.id,
        recipientId: recipient.id,
        subject: input.subject.trim(),
        category: input.category ?? 'staff',
      },
      include: {
        starter: { include: PARTICIPANT_INCLUDE },
        recipient: { include: PARTICIPANT_INCLUDE },
        messages: {
          include: { author: { include: PARTICIPANT_INCLUDE } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return this.toConversation(conversation, user.id);
  }

  async messages(
    user: AuthUser,
    conversationId: string,
    query: ListQuery = {},
  ) {
    validateListFilters(query);
    await this.requireParticipant(user, conversationId);
    const where: Prisma.ChatMessageWhereInput = {
      conversationId,
      createdAt: dateRange(query),
      ...(query.search && {
        content: { contains: query.search, mode: 'insensitive' },
      }),
    };
    const [messages, total] = await this.prisma.$transaction([
      this.prisma.chatMessage.findMany({
        where,
        include: { author: { include: PARTICIPANT_INCLUDE } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageWindow(query),
      }),
      this.prisma.chatMessage.count({ where }),
    ]);
    return paginated(
      messages.reverse().map((message) => this.toMessage(message, user.id)),
      total,
      query,
    );
  }

  async send(
    user: AuthUser,
    conversationId: string,
    input: SendMessageCommand,
  ) {
    const conversation = await this.requireParticipant(user, conversationId);
    const message = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.chatMessage.create({
        data: {
          conversationId,
          authorId: user.id,
          content: input.content.trim(),
          ...(input.attachments?.length && {
            attachments: input.attachments as Prisma.InputJsonValue,
          }),
        },
        include: { author: { include: PARTICIPANT_INCLUDE } },
      });
      // Sending implies the sender has read the thread up to this message.
      await transaction.chatConversation.update({
        where: { id: conversationId },
        data:
          conversation.starterId === user.id
            ? { updatedAt: new Date(), starterLastReadAt: created.createdAt }
            : { updatedAt: new Date(), recipientLastReadAt: created.createdAt },
      });
      return created;
    });
    return this.toMessage(message, user.id);
  }

  async getAttachment(
    user: AuthUser,
    conversationId: string,
    messageId: string,
    attachmentId: string,
  ) {
    await this.requireParticipant(user, conversationId);
    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, conversationId },
      select: { attachments: true },
    });
    const attachments = Array.isArray(message?.attachments)
      ? (message.attachments as unknown as ChatAttachmentRecord[])
      : [];
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) throw new NotFoundException('Attachment not found');
    return {
      storageKey: attachment.storageKey,
      name: attachment.name,
      mimeType: attachment.mimeType,
    };
  }

  async participants(user: AuthUser, conversationId: string) {
    const { starterId, recipientId } = await this.requireParticipant(
      user,
      conversationId,
    );
    return { starterId, recipientId };
  }

  private async requireParticipant(user: AuthUser, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        branchId: user.branchId,
        OR: [{ starterId: user.id }, { recipientId: user.id }],
      },
      select: { id: true, starterId: true, recipientId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  private toConversation(
    conversation: {
      id: string;
      starterId: string;
      recipientId: string;
      category: string;
      channel: string;
      subject: string;
      updatedAt: Date;
      starterLastReadAt: Date | null;
      recipientLastReadAt: Date | null;
      starter: {
        email: string;
        Person: { firstName: string; lastName: string }[];
      };
      recipient: {
        email: string;
        Person: { firstName: string; lastName: string }[];
      };
      messages: {
        id: string;
        conversationId: string;
        authorId: string;
        content: string;
        createdAt: Date;
        attachments: Prisma.JsonValue | null;
        author: {
          email: string;
          Person: { firstName: string; lastName: string }[];
        };
      }[];
    },
    userId: string,
  ) {
    const contact =
      conversation.starterId === userId
        ? conversation.recipient
        : conversation.starter;
    const lastReadAt =
      conversation.starterId === userId
        ? conversation.starterLastReadAt
        : conversation.recipientLastReadAt;
    // Counted over the loaded window (latest 50 messages).
    const unreadCount = conversation.messages.filter(
      (message) =>
        message.authorId !== userId &&
        (!lastReadAt || message.createdAt > lastReadAt),
    ).length;
    return {
      id: conversation.id,
      contact: {
        id:
          conversation.starterId === userId
            ? conversation.recipientId
            : conversation.starterId,
        name: this.userName(contact),
        email: contact.email,
        avatar: '',
      },
      category: conversation.category,
      channel: conversation.channel,
      subject: conversation.subject,
      updatedAt: conversation.updatedAt.toISOString(),
      unreadCount,
      messages: conversation.messages.map((message) =>
        this.toMessage(message, userId),
      ),
    };
  }

  private toMessage(
    message: {
      id: string;
      conversationId: string;
      authorId: string;
      content: string;
      createdAt: Date;
      attachments: Prisma.JsonValue | null;
      author: {
        email: string;
        Person: { firstName: string; lastName: string }[];
      };
    },
    userId: string,
  ): ChatMessageView {
    const attachments = Array.isArray(message.attachments)
      ? (message.attachments as unknown as ChatAttachmentRecord[]).map(
          (attachment) => ({
            id: attachment.id,
            name: attachment.name,
            mimeType: attachment.mimeType,
            size: attachment.size,
            url: `/chat/conversations/${message.conversationId}/messages/${message.id}/attachments/${attachment.id}/file`,
          }),
        )
      : [];
    return {
      id: message.id,
      sender: message.authorId === userId ? 'me' : 'contact',
      text: message.content,
      sentAt: message.createdAt.toISOString(),
      ...(attachments.length > 0 && { attachments }),
    };
  }

  private userName(user: {
    email: string;
    Person: { firstName: string; lastName: string }[];
  }) {
    return user.Person[0]
      ? `${user.Person[0].firstName} ${user.Person[0].lastName}`.trim()
      : user.email;
  }
}
