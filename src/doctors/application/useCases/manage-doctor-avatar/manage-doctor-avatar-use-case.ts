import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../../../auth/auth-user';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';
import { IDoctorRepository } from '../../../domain/doctor.repository';

type AvatarUpload = { mimetype: string; buffer: Buffer };

export class ManageDoctorAvatarUseCase {
  constructor(
    private readonly repository: IDoctorRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async upload(user: AuthUser, doctorId: string, file: AvatarUpload) {
    const previousKey = this.normalizeAvatarKey(
      doctorId,
      await this.repository.getAvatarStorageKey(user.branchId, doctorId),
    );
    const storageKey = `doctors/${doctorId}/avatar/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      await this.repository.updateAvatarStorageKey(
        user.branchId,
        doctorId,
        storageKey,
      );
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (previousKey)
      await this.storage.delete(previousKey).catch(() => undefined);
    return { avatar: `/doctors/${doctorId}/avatar` };
  }

  async get(user: AuthUser, doctorId: string) {
    const storageKey = this.normalizeAvatarKey(
      doctorId,
      await this.repository.getAvatarStorageKey(user.branchId, doctorId),
    );
    if (!storageKey) throw new NotFoundException('Doctor avatar not found');
    const file = await this.storage.get(storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? 'application/octet-stream',
    };
  }

  private normalizeAvatarKey(doctorId: string, key: string | null) {
    return key?.startsWith(`doctors/${doctorId}/avatar/`) ? key : null;
  }
}
