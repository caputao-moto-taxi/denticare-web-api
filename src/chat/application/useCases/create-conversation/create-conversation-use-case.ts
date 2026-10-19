import { AuthUser } from '../../../../auth/auth-user';
import {
  CreateConversationCommand,
  IChatRepository,
} from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';

export type CreateConversationInput = {
  user: AuthUser;
  input: CreateConversationCommand;
};

export class CreateConversationUseCase {
  constructor(
    private readonly repository: IChatRepository,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async execute({ user, input }: CreateConversationInput) {
    const conversation = await this.repository.create(user, input);
    this.realtime.conversationCreated(input.recipientId, conversation.id);
    return conversation;
  }
}
