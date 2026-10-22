import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IPatientRepository } from '../../../domain/patient.repository';

export type ListPatientsInput = { user: AuthUser; query?: ListQuery };

export class ListPatientsUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, query }: ListPatientsInput) {
    return this.repository.list(user, query);
  }
}
