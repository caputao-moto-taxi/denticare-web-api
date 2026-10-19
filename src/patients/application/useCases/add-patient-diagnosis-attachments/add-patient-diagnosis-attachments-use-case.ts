import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientDiagnosisAttachmentCommand,
} from '../../../domain/patient.repository';

export type AddPatientDiagnosisAttachmentsInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  files: PatientDiagnosisAttachmentCommand[];
};

export class AddPatientDiagnosisAttachmentsUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({
    user,
    id,
    diagnosisId,
    files,
  }: AddPatientDiagnosisAttachmentsInput) {
    return this.repository.addDiagnosisAttachments(
      user,
      id,
      diagnosisId,
      files,
    );
  }
}
