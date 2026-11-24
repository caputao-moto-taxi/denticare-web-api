import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';
import { IChatRepository } from '../../../domain/chat.repository';
import {
  parseChatAttachmentRecords,
  requireConversationParticipant,
} from '../shared/chat-rules';

export type GetChatAttachmentInput = {
  user: AuthUser;
  conversationId: string;
  messageId: string;
  attachmentId: string;
};

export class GetChatAttachmentUseCase {
  constructor(
    private readonly repository: IChatRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async execute(input: GetChatAttachmentInput) {
    await requireConversationParticipant(
      this.repository,
      input.user,
      input.conversationId,
    );
    const message = await this.repository.findMessageAttachments(
      input.conversationId,
      input.messageId,
    );
    const attachment = parseChatAttachmentRecords(message?.attachments).find(
      (item) => item.id === input.attachmentId,
    );
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    const file = await this.storage.get(attachment.storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? attachment.mimeType,
      fileName: attachment.name,
    };
  }
}
