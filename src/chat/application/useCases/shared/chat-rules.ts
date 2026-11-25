import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  ChatAttachmentRecord,
  ChatConversationScopeRecord,
  ChatMessageRecord,
  ChatParticipantRecord,
  ChatUserRecord,
  IChatRepository,
} from '../../../domain/chat.repository';

export async function requireConversationParticipant(
  repository: IChatRepository,
  user: AuthUser,
  conversationId: string,
): Promise<ChatConversationScopeRecord> {
  const conversation = await repository.findConversation(conversationId);
  if (
    !conversation ||
    conversation.branchId !== user.branchId ||
    (conversation.starterId !== user.id && conversation.recipientId !== user.id)
  ) {
    throw new NotFoundException('Conversation not found');
  }
  return conversation;
}

export function toChatUserName(
  user: Pick<ChatParticipantRecord, 'email' | 'Person'>,
): string {
  return user.Person[0]
    ? `${user.Person[0].firstName} ${user.Person[0].lastName}`.trim()
    : user.email;
}

export function toChatContact(user: ChatUserRecord) {
  return {
    id: user.id,
    name: toChatUserName(user),
    email: user.email,
    role: user.Role?.slug ?? 'staff',
    avatar: '',
  };
}

export function parseChatAttachmentRecords(
  value: unknown,
): ChatAttachmentRecord[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new InternalServerErrorException('Invalid chat attachment metadata');
  }

  return value.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('id' in item) ||
      typeof item.id !== 'string' ||
      !('storageKey' in item) ||
      typeof item.storageKey !== 'string' ||
      !('name' in item) ||
      typeof item.name !== 'string' ||
      !('mimeType' in item) ||
      typeof item.mimeType !== 'string' ||
      !('size' in item) ||
      typeof item.size !== 'number'
    ) {
      throw new InternalServerErrorException(
        'Invalid chat attachment metadata',
      );
    }
    return {
      id: item.id,
      storageKey: item.storageKey,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size,
    };
  });
}

export function toChatMessage(message: ChatMessageRecord, userId: string) {
  const attachments = parseChatAttachmentRecords(message.attachments).map(
    (attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: `/chat/conversations/${message.conversationId}/messages/${message.id}/attachments/${attachment.id}/file`,
    }),
  );
  return {
    id: message.id,
    sender:
      message.authorId === userId ? ('me' as const) : ('contact' as const),
    text: message.content,
    sentAt: message.createdAt.toISOString(),
    ...(attachments.length > 0 && { attachments }),
  };
}

export function toChatConversation(
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
    starter: ChatParticipantRecord;
    recipient: ChatParticipantRecord;
    messages: ChatMessageRecord[];
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
  const messages = [...conversation.messages].reverse();
  const unreadCount = messages.filter(
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
      name: toChatUserName(contact),
      email: contact.email,
      avatar: '',
    },
    category: conversation.category,
    channel: conversation.channel,
    subject: conversation.subject,
    updatedAt: conversation.updatedAt.toISOString(),
    unreadCount,
    messages: messages.map((message) => toChatMessage(message, userId)),
  };
}
