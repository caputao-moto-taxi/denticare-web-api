import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import { IPatientRepository } from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type GetPatientDiagnosisAttachmentInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  attachmentId: string;
};

export class GetPatientDiagnosisAttachmentUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly fileStorage: IPatientFileStorage,
  ) {}

  async execute({
    user,
    id,
    diagnosisId,
    attachmentId,
  }: GetPatientDiagnosisAttachmentInput) {
    requirePatientClinicalAccess(user, 'read');
    const attachment = await this.repository.getDiagnosisAttachment(
      user,
      id,
      diagnosisId,
      attachmentId,
    );
    const file = await this.fileStorage.get(attachment.storageKey);
    return {
      data: file.data,
      mimeType:
        attachment.mimeType || file.mime_type || 'application/octet-stream',
      fileName: attachment.fileName,
    };
  }
}
