import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { UpdatePatientUseCase } from '../update-patient/update-patient-use-case';
import { CreatePatientUseCase } from './create-patient-use-case';

const staffUser: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.test',
  role: 'admin',
  branchId: 'branch-1',
  permissions: [],
};

const patientInput = {
  name: 'Ana Costa',
  email: '  ANA@EXAMPLE.TEST ',
  address: 'Rua Central',
};

describe('CreatePatientUseCase', () => {
  const repository = {
    emailExists: jest.fn(),
    create: jest.fn(),
  };
  const useCase = new CreatePatientUseCase(
    repository as unknown as IPatientRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('normalizes email and delegates persistence', async () => {
    repository.emailExists.mockResolvedValue(false);
    repository.create.mockResolvedValue({ id: 'patient-1' });

    await useCase.execute({ user: staffUser, patient: patientInput });

    expect(repository.emailExists).toHaveBeenCalledWith('ana@example.test');
    expect(repository.create).toHaveBeenCalledWith(
      staffUser,
      expect.objectContaining({
        firstName: 'Ana',
        lastName: 'Costa',
        address: patientInput.address,
        email: 'ana@example.test',
      }),
    );
  });

  it('rejects duplicate email before asking the repository to create', async () => {
    repository.emailExists.mockResolvedValue(true);

    await expect(
      useCase.execute({ user: staffUser, patient: patientInput }),
    ).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects non-staff before querying the repository', async () => {
    await expect(
      useCase.execute({
        user: { ...staffUser, id: 'patient-1', role: 'patient' },
        patient: patientInput,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.emailExists).not.toHaveBeenCalled();
  });

  it('allows an unchanged email during patient updates', async () => {
    repository.emailExists.mockResolvedValue(false);
    repository.update = jest.fn().mockResolvedValue({ id: 'patient-1' });
    const useCase = new UpdatePatientUseCase(
      repository as unknown as IPatientRepository,
    );

    await useCase.execute({
      user: staffUser,
      id: 'patient-1',
      changes: { email: '  ANA@EXAMPLE.TEST ', name: '  Ana   Costa ' },
    });

    expect(repository.emailExists).toHaveBeenCalledWith(
      'ana@example.test',
      'patient-1',
    );
    expect(repository.update).toHaveBeenCalledWith(staffUser, 'patient-1', {
      email: 'ana@example.test',
      firstName: 'Ana',
      lastName: 'Costa',
    });
  });
});
