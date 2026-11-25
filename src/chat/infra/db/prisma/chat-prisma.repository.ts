import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { personSearch } from '../../../../shared/helpers/list-filters';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  ChatContactListCriteria,
  ChatConversationListCriteria,
  ChatConversationRecord,
  ChatConversationScopeRecord,
  ChatConversationUpdate,
  ChatMessageListCriteria,
  ChatMessageRecord,
  ChatUserRecord,
  CreateConversationData,
  CreateMessageData,
  IChatRepository,
} from '../../../domain/chat.repository';

const PARTICIPANT_INCLUDE = {
  Person: {
    where: { deletedAt: null },
    select: { firstName: true, lastName: true },
    take: 1,
  },
} satisfies Prisma.UserInclude;

const CONVERSATION_INCLUDE = {
  starter: { include: PARTICIPANT_INCLUDE },
  recipient: { include: PARTICIPANT_INCLUDE },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { author: { include: PARTICIPANT_INCLUDE } },
  },
} satisfies Prisma.ChatConversationInclude;

const MESSAGE_INCLUDE = {
  author: { include: PARTICIPANT_INCLUDE },
} satisfies Prisma.ChatMessageInclude;

@Injectable()
export class ChatPrismaRepository implements IChatRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: Prisma.TransactionClient | PrismaService = prisma,
  ) {}

  transaction<T>(
    operation: (repository: IChatRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((transaction) =>
      operation(new ChatPrismaRepository(this.prisma, transaction)),
    );
  }

  async unreadCount(input: { userId: string; branchId: string }) {
    const [result] = await this.client.$queryRaw<Array<{ count: number }>>(
      Prisma.sql`
        SELECT COUNT(*)::int AS "count"
        FROM "chat_messages" AS message
        INNER JOIN "chat_conversations" AS conversation
          ON conversation."id" = message."conversationId"
        WHERE conversation."branchId" = ${input.branchId}
          AND message."authorId" <> ${input.userId}
          AND (
            (
              conversation."starterId" = ${input.userId}
              AND (
                conversation."starterLastReadAt" IS NULL
                OR message."createdAt" > conversation."starterLastReadAt"
              )
            )
            OR (
              conversation."recipientId" = ${input.userId}
              AND (
                conversation."recipientLastReadAt" IS NULL
                OR message."createdAt" > conversation."recipientLastReadAt"
              )
            )
          )
      `,
    );
    if (!result) {
      throw new Error('Unread message count query returned no result');
    }
    return { count: result.count };
  }

  async listConversations(criteria: ChatConversationListCriteria) {
    const updatedAt: Prisma.DateTimeFilter = {
      ...(criteria.updatedAtFrom && { gte: criteria.updatedAtFrom }),
      ...(criteria.updatedAtToExclusive && {
        lt: criteria.updatedAtToExclusive,
      }),
    };
    const where: Prisma.ChatConversationWhereInput = {
      branchId: criteria.branchId,
      OR: [
        { starterId: criteria.participantId },
        { recipientId: criteria.participantId },
      ],
      ...(criteria.category && { category: criteria.category }),
      ...(Object.keys(updatedAt).length > 0 && { updatedAt }),
      ...(criteria.search && {
        AND: [
          {
            OR: [
              {
                subject: {
                  contains: criteria.search,
                  mode: 'insensitive',
                },
              },
              {
                starter: {
                  id: { not: criteria.participantId },
                  Person: { some: personSearch(criteria.search) },
                },
              },
              {
                recipient: {
                  id: { not: criteria.participantId },
                  Person: { some: personSearch(criteria.search) },
                },
              },
            ],
          },
        ],
      }),
    };
    const [conversations, total] = await this.prisma.$transaction([
      this.client.chatConversation.findMany({
        where,
        include: {
          ...CONVERSATION_INCLUDE,
          messages: {
            ...CONVERSATION_INCLUDE.messages,
            take: criteria.messageLimit,
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: criteria.skip,
        take: criteria.take,
      }),
      this.client.chatConversation.count({ where }),
    ]);
    return { conversations, total };
  }

  async listContacts(criteria: ChatContactListCriteria) {
    const createdAt: Prisma.DateTimeFilter = {
      ...(criteria.createdAtFrom && { gte: criteria.createdAtFrom }),
      ...(criteria.createdAtToExclusive && {
        lt: criteria.createdAtToExclusive,
      }),
    };
    const where: Prisma.UserWhereInput = {
      branchId: criteria.branchId,
      id: { not: criteria.excludedUserId },
      isActive: true,
      deletedAt: null,
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(criteria.role && { Role: { slug: criteria.role } }),
      ...(criteria.search && {
        OR: [
          {
            email: {
              contains: criteria.search,
              mode: 'insensitive',
            },
          },
          { Person: { some: personSearch(criteria.search) } },
        ],
      }),
    };
    const [contacts, total] = await this.prisma.$transaction([
      this.client.user.findMany({
        where,
        include: { ...PARTICIPANT_INCLUDE, Role: { select: { slug: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: criteria.skip,
        take: criteria.take,
      }),
      this.client.user.count({ where }),
    ]);
    return { contacts, total };
  }

  findConversation(
    conversationId: string,
  ): Promise<ChatConversationScopeRecord | null> {
    return this.client.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        branchId: true,
        starterId: true,
        recipientId: true,
      },
    });
  }

  findUser(userId: string): Promise<ChatUserRecord | null> {
    return this.client.user.findUnique({
      where: { id: userId },
      include: { ...PARTICIPANT_INCLUDE, Role: { select: { slug: true } } },
    });
  }

  createConversation(
    data: CreateConversationData,
  ): Promise<ChatConversationRecord> {
    return this.client.chatConversation.create({
      data,
      include: {
        starter: { include: PARTICIPANT_INCLUDE },
        recipient: { include: PARTICIPANT_INCLUDE },
        messages: {
          include: { author: { include: PARTICIPANT_INCLUDE } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listMessages(criteria: ChatMessageListCriteria) {
    const createdAt: Prisma.DateTimeFilter = {
      ...(criteria.createdAtFrom && { gte: criteria.createdAtFrom }),
      ...(criteria.createdAtToExclusive && {
        lt: criteria.createdAtToExclusive,
      }),
    };
    const where: Prisma.ChatMessageWhereInput = {
      conversationId: criteria.conversationId,
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(criteria.search && {
        content: { contains: criteria.search, mode: 'insensitive' },
      }),
    };
    const [messages, total] = await this.prisma.$transaction([
      this.client.chatMessage.findMany({
        where,
        include: MESSAGE_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: criteria.skip,
        take: criteria.take,
      }),
      this.client.chatMessage.count({ where }),
    ]);
    return { messages, total };
  }

  createMessage(data: CreateMessageData): Promise<ChatMessageRecord> {
    return this.client.chatMessage.create({
      data: {
        conversationId: data.conversationId,
        authorId: data.authorId,
        content: data.content,
        ...(data.attachments?.length && {
          attachments: data.attachments as Prisma.InputJsonValue,
        }),
      },
      include: MESSAGE_INCLUDE,
    });
  }

  async updateConversation(
    conversationId: string,
    data: ChatConversationUpdate,
  ): Promise<void> {
    await this.client.chatConversation.update({
      where: { id: conversationId },
      data,
    });
  }

  findMessageAttachments(
    conversationId: string,
    messageId: string,
  ): Promise<{ attachments: unknown } | null> {
    return this.client.chatMessage.findFirst({
      where: { id: messageId, conversationId },
      select: { attachments: true },
    });
  }
}
