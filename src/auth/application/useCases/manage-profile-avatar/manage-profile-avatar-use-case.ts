import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../../auth-user';
import { IAuthRepository } from '../../../domain/auth.repository';
import { PatientExamStorage } from '../../../../patients/infra/storage/patient-exam-storage';
import { isProfileAvatarKey } from '../shared/auth-profile';

type AvatarUpload = { mimetype: string; size: number; buffer: Buffer };

export class ManageProfileAvatarUseCase {
  private readonly logger = new Logger(ManageProfileAvatarUseCase.name);

  constructor(
    private readonly repository: IAuthRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async upload(user: AuthUser, file?: AvatarUpload) {
    if (
      !file?.size ||
      file.size > 5 * 1024 * 1024 ||
      file.buffer.byteLength !== file.size ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'A non-empty JPEG, PNG, or WebP avatar is required',
      );
    }

    const storedPreviousKey = await this.repository.findProfileAvatarStorageKey(
      user.id,
    );
    const previousKey =
      storedPreviousKey && isProfileAvatarKey(user.id, storedPreviousKey)
        ? storedPreviousKey
        : null;
    const storageKey = `users/${user.id}/avatar/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      const updated = await this.repository.updateProfileAvatarStorageKey(
        user.id,
        storageKey,
      );
      if (updated === 0) {
        throw new NotFoundException('User profile is unavailable');
      }
    } catch (error) {
      try {
        await this.storage.delete(storageKey);
      } catch {
        this.logger.warn('Failed to remove an unlinked profile avatar');
      }
      throw error;
    }
    if (previousKey) {
      try {
        await this.storage.delete(previousKey);
      } catch {
        this.logger.warn('Failed to remove a replaced profile avatar');
      }
    }
    return { avatar: '/auth/me/avatar' };
  }

  async get(user: AuthUser) {
    const storageKey = await this.repository.findProfileAvatarStorageKey(
      user.id,
    );
    if (!storageKey || !isProfileAvatarKey(user.id, storageKey)) {
      throw new NotFoundException('Profile avatar not found');
    }
    const file = await this.storage.get(storageKey);
    return {
      data: file.data,
      mimeType: file.mime_type ?? 'application/octet-stream',
    };
  }
}
