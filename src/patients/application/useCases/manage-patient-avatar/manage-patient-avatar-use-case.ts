import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { PatientExamStorage } from '../../../infra/storage/patient-exam-storage';
import { IPatientRepository } from '../../../domain/patient.repository';

type AvatarUpload = { mimetype: string; buffer: Buffer };

export class ManagePatientAvatarUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async upload(user: AuthUser, patientId: string, file: AvatarUpload) {
    const previousKey = await this.repository.getAvatarStorageKey(
      user,
      patientId,
    );
    const storageKey = `patients/${patientId}/avatar/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      await this.repository.updateAvatarStorageKey(user, patientId, storageKey);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (previousKey)
      await this.storage.delete(previousKey).catch(() => undefined);
    return { avatar: `/patients/${patientId}/avatar` };
  }

  async get(user: AuthUser, patientId: string) {
    const storageKey = await this.repository.getAvatarStorageKey(
      user,
      patientId,
    );
    if (!storageKey) throw new NotFoundException('Patient avatar not found');
    const file = await this.storage.get(storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? 'application/octet-stream',
    };
  }
}
