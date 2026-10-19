import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IDoctorRepository } from '../../../domain/doctor.repository';

export type ListDoctorsInput = { user: AuthUser; query?: ListQuery };

export class ListDoctorsUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  execute({ user, query }: ListDoctorsInput) {
    return this.repository.list(user, query);
  }
}
