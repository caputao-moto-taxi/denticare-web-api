import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { PatientExamStorage } from '../../../patients/infra/storage/patient-exam-storage';
import {
  ClinicServiceCommand,
  ClinicServiceUpdateCommand,
  ClinicSettingsUpdateCommand,
  IClinicSettingsRepository,
} from '../../domain/clinic-settings.repository';

@Injectable()
export class GetClinicSettingsUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  execute(user: AuthUser) {
    return this.repository.getSettings(user);
  }
}

@Injectable()
export class UpdateClinicSettingsUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  execute(user: AuthUser, input: ClinicSettingsUpdateCommand) {
    return this.repository.updateSettings(user, input);
  }
}

@Injectable()
export class ManageClinicServicesUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  list(user: AuthUser) {
    return this.repository.listServices(user);
  }

  create(user: AuthUser, input: ClinicServiceCommand) {
    return this.repository.createService(user, input);
  }

  update(user: AuthUser, id: string, input: ClinicServiceUpdateCommand) {
    return this.repository.updateService(user, id, input);
  }

  delete(user: AuthUser, id: string) {
    return this.repository.deleteService(user, id);
  }
}

@Injectable()
export class GetPublicClinicUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  execute(branchId: string) {
    return this.repository.getPublicClinic(branchId);
  }
}

@Injectable()
export class ManageClinicLogoUseCase {
  constructor(
    private readonly repository: IClinicSettingsRepository,
    private readonly storage: PatientExamStorage,
  ) {}

  async upload(user: AuthUser, file: { mimetype: string; buffer: Buffer }) {
    const previousKey = await this.repository.getLogoKey(user);
    const storageKey = `headquarters/${user.branchId}/logo/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      await this.repository.updateLogoKey(user, storageKey);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (previousKey)
      await this.storage.delete(previousKey).catch(() => undefined);
    return { logoUrl: '/clinic/settings/logo' };
  }

  async getForUser(user: AuthUser) {
    const storageKey = await this.repository.getLogoKey(user);
    if (!storageKey) throw new NotFoundException('Clinic logo not found');
    return this.storage.get(storageKey);
  }

  async getPublic(branchId: string) {
    const storageKey = await this.repository.getPublicLogoKey(branchId);
    return this.storage.get(storageKey);
  }
}
