import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IAppointmentRepository } from '../../../domain/appointment.repository';

export type ListAppointmentsInput = { user: AuthUser; query?: ListQuery };

export class ListAppointmentsUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, query }: ListAppointmentsInput) {
    return this.repository.list(user, query);
  }
}
