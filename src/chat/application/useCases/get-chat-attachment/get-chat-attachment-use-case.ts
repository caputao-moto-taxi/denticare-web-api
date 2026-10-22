import { AuthUser } from '../../../../auth/auth-user';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';
import { IChatRepository } from '../../../domain/chat.repository';

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
    const attachment = await this.repository.getAttachment(
      input.user,
      input.conversationId,
      input.messageId,
      input.attachmentId,
    );
    const file = await this.storage.get(attachment.storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? attachment.mimeType,
      fileName: attachment.name,
    };
  }
}
