import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { ListPatientsUseCase } from './list-patients-use-case';

const user: AuthUser = {
  id: 'admin-1',
  email: 'admin@example.test',
  role: 'admin',
  branchId: 'branch-1',
  permissions: [],
};

describe('ListPatientsUseCase', () => {
  const repository = { list: jest.fn() };
  const useCase = new ListPatientsUseCase(
    repository as unknown as IPatientRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('validates status filters before querying the repository', () => {
    expect(() =>
      useCase.execute({ user, query: { status: 'deleted' } }),
    ).toThrow(BadRequestException);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('delegates validated filters to the repository', () => {
    repository.list.mockReturnValue({ data: [], total: 0 });
    const query = { status: 'active' };

    useCase.execute({ user, query });

    expect(repository.list).toHaveBeenCalledWith(user, query);
  });
});
