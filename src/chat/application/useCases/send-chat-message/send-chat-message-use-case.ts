import { randomUUID } from 'crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';
import {
  ChatAttachmentRecord,
  ChatMessageUpload,
  IChatRepository,
  SendMessageCommand,
} from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';
import {
  requireConversationParticipant,
  toChatMessage,
} from '../shared/chat-rules';

export type SendChatMessageInput = {
  user: AuthUser;
  conversationId: string;
  input: SendMessageCommand & { files?: ChatMessageUpload[] };
};

async function removeStoredAttachments(
  storage: PatientExamStorage,
  attachments: ChatAttachmentRecord[],
) {
  const results = await Promise.allSettled(
    attachments.map((attachment) => storage.delete(attachment.storageKey)),
  );
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Failed to remove chat attachments');
  }
}

export class SendChatMessageUseCase {
  constructor(
    private readonly repository: IChatRepository,
    private readonly realtime: ChatRealtimeService,
    private readonly storage: PatientExamStorage,
  ) {}

  async execute({ user, conversationId, input }: SendChatMessageInput) {
    const conversation = await requireConversationParticipant(
      this.repository,
      user,
      conversationId,
    );
    const attachments: ChatAttachmentRecord[] = [];

    try {
      for (const file of input.files ?? []) {
        const id = randomUUID();
        const storageKey = `chat/${id}`;
        const mimeType = file.mimetype || 'application/octet-stream';
        attachments.push({
          id,
          storageKey,
          name: file.originalname,
          mimeType,
          size: file.size,
        });
        await this.storage.store({
          id: storageKey,
          data: file.buffer,
          mimeType,
        });
      }
    } catch (error) {
      try {
        await removeStoredAttachments(this.storage, attachments);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Failed to store a chat message and clean up its attachments',
        );
      }
      throw error;
    }

    let message;
    try {
      message = await this.repository.transaction(async (transaction) => {
        const created = await transaction.createMessage({
          conversationId,
          authorId: user.id,
          content: input.content.trim(),
          ...(attachments.length > 0 && { attachments }),
        });
        await transaction.updateConversation(conversationId, {
          updatedAt: new Date(),
          ...(conversation.starterId === user.id
            ? { starterLastReadAt: created.createdAt }
            : { recipientLastReadAt: created.createdAt }),
        });
        return created;
      });
    } catch (error) {
      try {
        await removeStoredAttachments(this.storage, attachments);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Failed to persist a chat message and clean up its attachments',
        );
      }
      throw error;
    }

    const participantIds = [conversation.starterId, conversation.recipientId];
    const messageView = toChatMessage(message, user.id);
    this.realtime.typingChanged({
      conversationId,
      userId: user.id,
      isTyping: false,
      participantIds,
    });
    this.realtime.messageCreated({
      conversationId,
      message: messageView,
      authorId: user.id,
      participantIds,
    });
    return messageView;
  }
}
