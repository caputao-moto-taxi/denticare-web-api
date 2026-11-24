import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { IDoctorRepository } from '../../domain/doctor.repository';
import { ManageDoctorAvatarUseCase } from './manage-doctor-avatar/manage-doctor-avatar-use-case';
import { ListDoctorsUseCase } from './list-doctors/list-doctors-use-case';
import { UpdateDoctorUseCase } from './update-doctor/update-doctor-use-case';

describe('Doctor use cases', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = {
    emailExists: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
  const repositoryPort = repository as unknown as IDoctorRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.emailExists.mockResolvedValue(false);
    repository.update.mockResolvedValue({ id: 'doctor-1' });
  });

  it('moves normalization and duplicate checks for profile updates into the use case', async () => {
    const useCase = new UpdateDoctorUseCase(repositoryPort);

    await useCase.execute({
      user: admin,
      id: 'doctor-1',
      changes: {
        name: ' Ana   Maria Costa ',
        email: ' ANA@EXAMPLE.TEST ',
        phone: ' 923000001 ',
        address: ' Rua 1 ',
      },
    });

    expect(repository.emailExists).toHaveBeenCalledWith(
      'ana@example.test',
      'doctor-1',
    );
    expect(repository.update).toHaveBeenCalledWith('branch-1', 'doctor-1', {
      firstName: 'Ana',
      lastName: 'Maria Costa',
      email: 'ana@example.test',
      phone: '923000001',
      address: 'Rua 1',
    });
  });

  it('rejects duplicate email before writing a profile update', async () => {
    repository.emailExists.mockResolvedValue(true);
    const useCase = new UpdateDoctorUseCase(repositoryPort);

    await expect(
      useCase.execute({
        user: admin,
        id: 'doctor-1',
        changes: { email: 'taken@example.test' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('still prevents a doctor from updating another profile', async () => {
    const useCase = new UpdateDoctorUseCase(repositoryPort);

    await expect(
      useCase.execute({
        user: { ...admin, role: 'doctor', id: 'doctor-2' },
        id: 'doctor-1',
        changes: { phone: '923000001' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.emailExists).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('validates doctor list filters before querying', () => {
    const useCase = new ListDoctorsUseCase(repositoryPort);

    expect(() =>
      useCase.execute({
        user: admin,
        query: { status: 'pending' },
      }),
    ).toThrow(BadRequestException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('does not serve avatar keys outside the doctor-specific storage prefix', async () => {
    const avatarRepository = {
      getAvatarStorageKey: jest.fn().mockResolvedValue('other/path/avatar.png'),
    };
    const storage = { get: jest.fn() };
    const useCase = new ManageDoctorAvatarUseCase(
      avatarRepository as unknown as IDoctorRepository,
      storage as never,
    );

    await expect(useCase.get(admin, 'doctor-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.get).not.toHaveBeenCalled();
  });
});
