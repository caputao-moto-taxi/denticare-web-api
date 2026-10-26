import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { validateListFilters } from '../../../../shared/helpers/list-filters';
import { IPatientRepository } from '../../../domain/patient.repository';

export type ListPatientsInput = { user: AuthUser; query?: ListQuery };

export class ListPatientsUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, query = {} }: ListPatientsInput) {
    validateListFilters(query, { status: ['active', 'inactive'] });
    return this.repository.list(user, query);
  }
}
