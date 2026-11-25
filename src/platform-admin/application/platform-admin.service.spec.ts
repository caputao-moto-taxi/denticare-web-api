import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';
import { IPlatformAdminRepository } from '../domain/platform-admin.repository';
import { PlatformAdminService } from './platform-admin.service';

describe('PlatformAdminService', () => {
  const actor = { id: 'platform-owner' } as AuthUser;
  const repository = {
    overview: jest.fn(),
    listClinics: jest.fn(),
    clinicDetails: jest.fn(),
    updateClinic: jest.fn(),
    setClinicStatus: jest.fn(),
    setUserStatus: jest.fn(),
  } as unknown as jest.Mocked<IPlatformAdminRepository>;
  const service = new PlatformAdminService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects empty clinic updates before persistence', async () => {
    expect(() => service.updateClinic('clinic-id', actor, {})).toThrow(
      BadRequestException,
    );
    expect(repository.updateClinic).not.toHaveBeenCalled();
  });

  it('normalizes clinic fields before delegating the update', async () => {
    await service.updateClinic('clinic-id', actor, {
      name: ' Updated Clinic ',
      email: '  ',
    });

    expect(repository.updateClinic).toHaveBeenCalledWith('clinic-id', actor, {
      name: 'Updated Clinic',
      email: null,
    });
  });

  it('passes application-selected audit actions to the repository', async () => {
    await service.setClinicStatus('clinic-id', actor, false);
    await service.setUserStatus('clinic-id', 'user-id', actor, true);

    expect(repository.setClinicStatus).toHaveBeenCalledWith(
      'clinic-id',
      actor,
      false,
      'CLINIC_DEACTIVATED',
    );
    expect(repository.setUserStatus).toHaveBeenCalledWith(
      'clinic-id',
      'user-id',
      actor,
      true,
      'USER_ACTIVATED',
    );
  });
});
