import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import {
  IPatientRepository,
  PatientDiagnosisAttachmentCommand,
} from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type AddPatientDiagnosisAttachmentsInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  files: PatientDiagnosisAttachmentCommand[];
};

export class AddPatientDiagnosisAttachmentsUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly fileStorage: IPatientFileStorage,
  ) {}

  async execute({
    user,
    id,
    diagnosisId,
    files,
  }: AddPatientDiagnosisAttachmentsInput) {
    requirePatientClinicalAccess(user);
    const storageKeys: string[] = [];
    try {
      const storedFiles = [];
      for (const file of files) {
        const storageKey = randomUUID();
        await this.fileStorage.store({
          id: storageKey,
          data: file.buffer,
          mimeType: file.mimetype,
        });
        storageKeys.push(storageKey);
        storedFiles.push({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          storageKey,
        });
      }

      const attachments = await this.repository.addDiagnosisAttachments(
        user,
        id,
        diagnosisId,
        storedFiles,
      );
      return attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
      }));
    } catch (error) {
      const cleanupResults = await Promise.allSettled(
        storageKeys.map((storageKey) => this.fileStorage.delete(storageKey)),
      );
      const cleanupErrors = cleanupResults
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .map((result) => result.reason);
      if (cleanupErrors.length) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Could not persist diagnosis attachments and clean up stored files',
        );
      }
      throw error;
    }
  }
}
