import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { PatientExamStorage } from '../../../patients/infra/storage/patient-exam-storage';
import {
  ClinicServiceCommand,
  ClinicServiceUpdateCommand,
  ClinicSettingsUpdateCommand,
  IClinicSettingsRepository,
} from '../../domain/clinic-settings.repository';

function ensureClinicAdmin(user: AuthUser) {
  if (user.role !== 'admin' && user.role !== 'administrator') {
    throw new ForbiddenException(
      'Only clinic administrators can manage settings',
    );
  }
}

@Injectable()
export class GetClinicSettingsUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  execute(user: AuthUser) {
    ensureClinicAdmin(user);
    return this.repository.getSettings(user.branchId);
  }
}

@Injectable()
export class UpdateClinicSettingsUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  execute(user: AuthUser, input: ClinicSettingsUpdateCommand) {
    ensureClinicAdmin(user);
    return this.repository.updateSettings(
      user.branchId,
      Object.fromEntries(
        Object.entries(input).map(([key, value]) => [key, value?.trim()]),
      ) as ClinicSettingsUpdateCommand,
    );
  }
}

@Injectable()
export class ManageClinicServicesUseCase {
  constructor(private readonly repository: IClinicSettingsRepository) {}

  list(user: AuthUser) {
    ensureClinicAdmin(user);
    return this.repository.listServices(user.branchId);
  }

  create(user: AuthUser, input: ClinicServiceCommand) {
    ensureClinicAdmin(user);
    return this.repository.createService(user.branchId, {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
    });
  }

  update(user: AuthUser, id: string, input: ClinicServiceUpdateCommand) {
    ensureClinicAdmin(user);
    return this.repository.updateService(user.branchId, id, {
      ...input,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && {
        description: input.description.trim(),
      }),
    });
  }

  delete(user: AuthUser, id: string) {
    ensureClinicAdmin(user);
    return this.repository.deleteService(user.branchId, id);
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
    ensureClinicAdmin(user);
    const previousKey = this.normalizeLogoKey(
      await this.repository.getLogoKey(user.branchId),
    );
    const storageKey = `headquarters/${user.branchId}/logo/${randomUUID()}`;
    await this.storage.store({
      id: storageKey,
      data: file.buffer,
      mimeType: file.mimetype,
    });
    try {
      await this.repository.updateLogoKey(user.branchId, storageKey);
    } catch (error) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    if (previousKey)
      await this.storage.delete(previousKey).catch(() => undefined);
    return { logoUrl: '/clinic/settings/logo' };
  }

  async getForUser(user: AuthUser) {
    ensureClinicAdmin(user);
    const storageKey = this.normalizeLogoKey(
      await this.repository.getLogoKey(user.branchId),
    );
    if (!storageKey) throw new NotFoundException('Clinic logo not found');
    return this.storage.get(storageKey);
  }

  async getPublic(branchId: string) {
    const storageKey = this.normalizeLogoKey(
      await this.repository.getPublicLogoKey(branchId),
    );
    if (!storageKey) throw new NotFoundException('Clinic logo not found');
    return this.storage.get(storageKey);
  }

  private normalizeLogoKey(value: string | null) {
    return value?.startsWith('headquarters/') ? value : null;
  }
}
