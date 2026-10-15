import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  CreateConversationCommand,
  IChatRepository,
  SendMessageCommand,
} from '../../domain/chat.repository';
import { ChatRealtimeService } from '../../infra/realtime/chat-realtime.service';

export class ChatUseCases {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly realtime: ChatRealtimeService,
  ) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.chatRepository.list(user, query);
  }

  unreadCount(user: AuthUser) {
    return this.chatRepository.unreadCount(user);
  }

  contacts(user: AuthUser, query?: ListQuery) {
    return this.chatRepository.contacts(user, query);
  }

  async markRead(user: AuthUser, conversationId: string) {
    const result = await this.chatRepository.markRead(user, conversationId);
    // Lets the user's other open sessions clear the unread badge too.
    this.realtime.conversationRead(user.id, conversationId);
    return result;
  }

  async create(user: AuthUser, input: CreateConversationCommand) {
    const conversation = await this.chatRepository.create(user, input);
    this.realtime.conversationCreated(
      input.recipientId,
      (conversation as { id: string }).id,
    );
    return conversation;
  }

  messages(user: AuthUser, conversationId: string, query?: ListQuery) {
    return this.chatRepository.messages(user, conversationId, query);
  }

  participants(user: AuthUser, conversationId: string) {
    return this.chatRepository.participants(user, conversationId);
  }

  async send(
    user: AuthUser,
    conversationId: string,
    input: SendMessageCommand,
  ) {
    const message = await this.chatRepository.send(user, conversationId, input);
    const { starterId, recipientId } = await this.chatRepository.participants(
      user,
      conversationId,
    );
    this.realtime.typingChanged({
      conversationId,
      userId: user.id,
      isTyping: false,
      participantIds: [starterId, recipientId],
    });
    this.realtime.messageCreated({
      conversationId,
      message,
      authorId: user.id,
      participantIds: [starterId, recipientId],
    });
    return message;
  }
}
