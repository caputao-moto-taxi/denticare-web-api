import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import { IPatientRepository } from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type GetPatientExamFileInput = {
  user: AuthUser;
  id: string;
  examId: string;
};

export class GetPatientExamFileUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly fileStorage: IPatientFileStorage,
  ) {}

  async execute({ user, id, examId }: GetPatientExamFileInput) {
    requirePatientClinicalAccess(user, 'read');
    const exam = await this.repository.getExamFile(user, id, examId);
    const file = await this.fileStorage.get(exam.storageKey);
    return {
      data: file.data,
      mimeType: exam.mimeType || file.mime_type || 'application/octet-stream',
      fileName: exam.fileName,
    };
  }
}
