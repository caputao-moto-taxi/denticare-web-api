import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';

export type CancelAppointmentInput = { user: AuthUser; id: string };

export class CancelAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, id }: CancelAppointmentInput) {
    return this.repository.cancel(user, id);
  }
}
