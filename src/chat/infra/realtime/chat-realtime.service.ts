import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { ChatMessageView } from '../../domain/chat.repository';

export const CHAT_EVENTS = {
  message: 'chat:message',
  conversation: 'chat:conversation',
  read: 'chat:read',
  typing: 'chat:typing',
} as const;

export const userRoom = (userId: string) => `user:${userId}`;

// Holds the socket namespace so use cases can publish events without depending on the gateway.
@Injectable()
export class ChatRealtimeService {
  private namespace?: Namespace;

  attach(namespace: Namespace) {
    this.namespace = namespace;
  }

  messageCreated(input: {
    conversationId: string;
    message: ChatMessageView;
    authorId: string;
    participantIds: string[];
  }) {
    for (const participantId of new Set(input.participantIds)) {
      const message: ChatMessageView =
        participantId === input.authorId
          ? input.message
          : { ...input.message, sender: 'contact' };
      this.emit(participantId, CHAT_EVENTS.message, {
        conversationId: input.conversationId,
        message,
      });
    }
  }

  conversationCreated(recipientId: string, conversationId: string) {
    this.emit(recipientId, CHAT_EVENTS.conversation, { conversationId });
  }

  conversationRead(userId: string, conversationId: string) {
    this.emit(userId, CHAT_EVENTS.read, { conversationId });
  }

  typingChanged(input: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    participantIds: string[];
  }) {
    for (const participantId of new Set(input.participantIds)) {
      if (participantId === input.userId) continue;
      this.emit(participantId, CHAT_EVENTS.typing, {
        conversationId: input.conversationId,
        userId: input.userId,
        isTyping: input.isTyping,
      });
    }
  }

  private emit(userId: string, event: string, payload: unknown) {
    this.namespace?.to(userRoom(userId)).emit(event, payload);
  }
}
