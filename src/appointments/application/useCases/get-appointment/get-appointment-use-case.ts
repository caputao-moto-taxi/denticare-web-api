import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';

export type GetAppointmentInput = { user: AuthUser; id: string };

export class GetAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, id }: GetAppointmentInput) {
    return this.repository.findOne(user, id);
  }
}
