import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';

export type CompleteAppointmentInput = { user: AuthUser; id: string };

export class CompleteAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, id }: CompleteAppointmentInput) {
    return this.repository.complete(user, id);
  }
}
