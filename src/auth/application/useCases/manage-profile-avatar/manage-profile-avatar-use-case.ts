import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';

type AvatarUpload = { mimetype: string; buffer: Buffer };

export class ManageProfileAvatarUseCase {
  constructor(
    private readonly repository: IAuthRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async upload(user: AuthUser, file: AvatarUpload) {
    const previousKey = await this.repository.getProfileAvatarStorageKey(user);
    const storageKey = `users/${user.id}/avatar/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      await this.repository.updateProfileAvatarStorageKey(user, storageKey);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (previousKey) {
      await this.storage.delete(previousKey).catch(() => undefined);
    }
    return { avatar: '/auth/me/avatar' };
  }

  async get(user: AuthUser) {
    const storageKey = await this.repository.getProfileAvatarStorageKey(user);
    if (!storageKey) throw new NotFoundException('Profile avatar not found');
    const file = await this.storage.get(storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? 'application/octet-stream',
    };
  }
}
