import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { IUserRepository } from '../../../domain/user.repository';
import { User } from '../../../domain/user.entity';
import { CreateUserUseCase } from './create-user-use-case';

describe('CreateUserUseCase', () => {
  const administrator: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = { create: jest.fn() };
  const hashService = { hashPassword: jest.fn() };
  const useCase = new CreateUserUseCase(
    repository as unknown as IUserRepository,
    hashService as unknown as IHashService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    hashService.hashPassword.mockResolvedValue('hashed-password');
    repository.create.mockResolvedValue(
      new User({
        id: 'user-1',
        name: 'Ana Costa',
        email: 'ana@example.test',
        phone: '',
        role: 'nurse',
        active: true,
        avatar: '',
      }),
    );
  });

  it('hashes credentials in the application layer before persistence', async () => {
    const output = await useCase.execute({
      user: administrator,
      name: 'Ana Costa',
      email: 'ana@example.test',
      role: 'nurse',
      password: 'Password1',
    });

    expect(hashService.hashPassword).toHaveBeenCalledWith('Password1');
    expect(repository.create).toHaveBeenCalledWith(administrator, {
      name: 'Ana Costa',
      email: 'ana@example.test',
      role: 'nurse',
      passwordHash: 'hashed-password',
    });
    expect(output).toEqual({
      id: 'user-1',
      name: 'Ana Costa',
      email: 'ana@example.test',
      phone: '',
      role: 'nurse',
      active: true,
      avatar: '',
    });
  });

  it('rejects non-administrators before hashing or persistence', async () => {
    await expect(
      useCase.execute({
        user: { ...administrator, role: 'doctor' },
        name: 'Ana Costa',
        email: 'ana@example.test',
        role: 'nurse',
        password: 'Password1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(hashService.hashPassword).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
