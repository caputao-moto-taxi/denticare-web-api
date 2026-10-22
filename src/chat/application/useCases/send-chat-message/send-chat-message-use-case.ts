import { AuthUser } from '../../../../auth/auth-user';
import { randomUUID } from 'crypto';
import {
  IChatRepository,
  ChatMessageUpload,
  SendMessageCommand,
} from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';

export type SendChatMessageInput = {
  user: AuthUser;
  conversationId: string;
  input: SendMessageCommand & { files?: ChatMessageUpload[] };
};

export class SendChatMessageUseCase {
  constructor(
    private readonly repository: IChatRepository,
    private readonly realtime: ChatRealtimeService,
    private readonly storage: PatientExamStorage,
  ) {}

  async execute({ user, conversationId, input }: SendChatMessageInput) {
    const { starterId, recipientId } = await this.repository.participants(
      user,
      conversationId,
    );
    const attachments: {
      id: string;
      storageKey: string;
      name: string;
      mimeType: string;
      size: number;
    }[] = [];
    try {
      for (const file of input.files ?? []) {
        const id = randomUUID();
        const storageKey = `chat/${id}`;
        attachments.push({
          id,
          storageKey,
          name: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
        });
        await this.storage.store({
          id: storageKey,
          data: file.buffer,
          mimeType: file.mimetype || 'application/octet-stream',
        });
      }
    } catch (error) {
      await Promise.allSettled(
        attachments.map((attachment) =>
          this.storage.delete(attachment.storageKey),
        ),
      );
      throw error;
    }

    let message;
    try {
      message = await this.repository.send(user, conversationId, {
        content: input.content,
        attachments,
      });
    } catch (error) {
      await Promise.allSettled(
        attachments.map((attachment) =>
          this.storage.delete(attachment.storageKey),
        ),
      );
      throw error;
    }

    const participantIds = [starterId, recipientId];
    this.realtime.typingChanged({
      conversationId,
      userId: user.id,
      isTyping: false,
      participantIds,
    });
    this.realtime.messageCreated({
      conversationId,
      message,
      authorId: user.id,
      participantIds,
    });
    return message;
  }
}
