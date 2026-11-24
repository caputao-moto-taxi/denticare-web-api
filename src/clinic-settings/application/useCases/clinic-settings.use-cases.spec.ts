import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { IClinicSettingsRepository } from '../../domain/clinic-settings.repository';
import {
  ManageClinicServicesUseCase,
  UpdateClinicSettingsUseCase,
} from './clinic-settings.use-cases';

describe('Clinic settings use cases', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = {
    updateSettings: jest.fn(),
    listServices: jest.fn(),
    createService: jest.fn(),
    updateService: jest.fn(),
    deleteService: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('enforces administrator access before repository calls', async () => {
    const useCase = new ManageClinicServicesUseCase(
      repository as unknown as IClinicSettingsRepository,
    );

    await expect(
      Promise.resolve().then(() => useCase.list({ ...admin, role: 'doctor' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.listServices).not.toHaveBeenCalled();
  });

  it('passes a normalized settings update scoped to the caller branch', async () => {
    const useCase = new UpdateClinicSettingsUseCase(
      repository as unknown as IClinicSettingsRepository,
    );

    await useCase.execute(admin, {
      name: ' Dental Care ',
      description: '  ',
      phone: ' +244 900 ',
    });

    expect(repository.updateSettings).toHaveBeenCalledWith('branch-1', {
      name: 'Dental Care',
      description: '',
      phone: '+244 900',
    });
  });

  it('normalizes service data before handing it to the repository', async () => {
    const useCase = new ManageClinicServicesUseCase(
      repository as unknown as IClinicSettingsRepository,
    );

    await useCase.create(admin, {
      name: ' Cleaning ',
      description: '  Polish  ',
      price: 5000,
      durationMinutes: 30,
    });

    expect(repository.createService).toHaveBeenCalledWith('branch-1', {
      name: 'Cleaning',
      description: 'Polish',
      price: 5000,
      durationMinutes: 30,
    });
  });

  it('keeps blank service descriptions as an explicit clear on update', async () => {
    const useCase = new ManageClinicServicesUseCase(
      repository as unknown as IClinicSettingsRepository,
    );

    await useCase.update(admin, 'service-1', { description: '  ' });

    expect(repository.updateService).toHaveBeenCalledWith(
      'branch-1',
      'service-1',
      {
        description: '',
      },
    );
  });
});
