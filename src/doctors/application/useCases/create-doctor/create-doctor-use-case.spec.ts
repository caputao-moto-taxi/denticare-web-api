import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { IDoctorRepository } from '../../../domain/doctor.repository';
import { CreateDoctorUseCase } from './create-doctor-use-case';

describe('CreateDoctorUseCase', () => {
  const administrator: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = { create: jest.fn(), emailExists: jest.fn() };
  const hashService = { hashPassword: jest.fn() };
  const useCase = new CreateDoctorUseCase(
    repository as unknown as IDoctorRepository,
    hashService as unknown as IHashService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.emailExists.mockResolvedValue(false);
    hashService.hashPassword.mockResolvedValue('hashed-password');
    repository.create.mockResolvedValue({ id: 'doctor-1' });
  });

  it('generates and hashes a random credential before persisting a doctor', async () => {
    const doctor = {
      name: ' Ana   Costa ',
      email: ' Ana@Example.Test ',
      address: ' Rua 1 ',
    };

    await expect(
      useCase.execute({ user: administrator, doctor }),
    ).resolves.toEqual({ id: 'doctor-1' });

    expect(hashService.hashPassword).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(repository.create).toHaveBeenCalledWith('branch-1', {
      firstName: 'Ana',
      lastName: 'Costa',
      email: 'ana@example.test',
      address: 'Rua 1',
      passwordHash: 'hashed-password',
    });
    expect(repository.emailExists).toHaveBeenCalledWith('ana@example.test');
  });

  it('rejects duplicate email before generating credentials', async () => {
    repository.emailExists.mockResolvedValue(true);

    await expect(
      useCase.execute({
        user: administrator,
        doctor: {
          name: 'Ana Costa',
          email: 'ana@example.test',
          address: 'Rua 1',
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(hashService.hashPassword).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects non-administrators before generating credentials', async () => {
    await expect(
      useCase.execute({
        user: { ...administrator, role: 'doctor' },
        doctor: {
          name: 'Ana Costa',
          email: 'ana@example.test',
          address: 'Rua 1',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(hashService.hashPassword).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
