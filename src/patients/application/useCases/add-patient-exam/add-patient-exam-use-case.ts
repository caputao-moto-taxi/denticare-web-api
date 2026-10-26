import { randomUUID } from 'node:crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientFileStorage } from '../../interfaces/patient-file-storage.interface';
import {
  IPatientRepository,
  PatientExamCommand,
} from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type AddPatientExamInput = {
  user: AuthUser;
  id: string;
  exam: PatientExamCommand;
};

export class AddPatientExamUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly fileStorage: IPatientFileStorage,
  ) {}

  async execute({ user, id, exam }: AddPatientExamInput) {
    requirePatientClinicalAccess(user);
    const storageKey = randomUUID();
    await this.fileStorage.store({
      id: storageKey,
      data: exam.file.buffer,
      mimeType: exam.file.mimetype,
    });

    try {
      const record = await this.repository.addExam(user, id, {
        title: exam.title.trim(),
        type: exam.type,
        doctorName: exam.doctorName.trim(),
        fileName: exam.file.originalname,
        mimeType: exam.file.mimetype,
        fileSize: exam.file.size,
        storageKey,
      });
      return {
        id: record.id,
        title: record.title,
        type: record.type,
        date: record.createdAt.toISOString(),
        doctorName: record.doctorName,
        fileName: record.fileName,
        mimeType: record.mimeType,
        fileSize: `${(record.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      };
    } catch (error) {
      await this.fileStorage.delete(storageKey);
      throw error;
    }
  }
}
