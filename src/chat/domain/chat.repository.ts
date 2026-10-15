import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';
export type CreateConversationCommand = {
  recipientId: string;
  subject: string;
  category?: 'staff' | 'patients' | 'post-care';
};

export type SendMessageCommand = { content: string };

// A message as seen by one viewer: `sender` is relative to that viewer.
export type ChatMessageView = {
  id: string;
  sender: 'me' | 'contact';
  text: string;
  sentAt: string;
};

export type ConversationParticipants = {
  starterId: string;
  recipientId: string;
};

export abstract class IChatRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract unreadCount(user: AuthUser): Promise<{ count: number }>;
  abstract contacts(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract markRead(user: AuthUser, conversationId: string): Promise<unknown>;
  abstract create(
    user: AuthUser,
    input: CreateConversationCommand,
  ): Promise<unknown>;
  abstract messages(
    user: AuthUser,
    conversationId: string,
    query?: ListQuery,
  ): Promise<unknown>;
  abstract send(
    user: AuthUser,
    conversationId: string,
    input: SendMessageCommand,
  ): Promise<ChatMessageView>;
  abstract participants(
    user: AuthUser,
    conversationId: string,
  ): Promise<ConversationParticipants>;
}
