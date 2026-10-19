import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientDiagnosisAttachmentInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  attachmentId: string;
};

export class GetPatientDiagnosisAttachmentUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({
    user,
    id,
    diagnosisId,
    attachmentId,
  }: GetPatientDiagnosisAttachmentInput) {
    return this.repository.getDiagnosisAttachment(
      user,
      id,
      diagnosisId,
      attachmentId,
    );
  }
}
