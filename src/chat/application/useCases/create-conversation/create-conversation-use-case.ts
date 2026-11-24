import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  CreateConversationCommand,
  IChatRepository,
} from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';
import { toChatConversation } from '../shared/chat-rules';

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
    if (user.id === input.recipientId) {
      throw new ForbiddenException(
        'A conversation must have another participant',
      );
    }

    const recipient = await this.repository.findUser(input.recipientId);
    if (
      !recipient ||
      recipient.branchId !== user.branchId ||
      !recipient.isActive ||
      recipient.deletedAt
    ) {
      throw new NotFoundException('Conversation participant not found');
    }

    const conversation = await this.repository.createConversation({
      branchId: user.branchId,
      starterId: user.id,
      recipientId: recipient.id,
      subject: input.subject.trim(),
      category: input.category ?? 'staff',
    });
    this.realtime.conversationCreated(recipient.id, conversation.id);
    return toChatConversation(conversation, user.id);
  }
}
