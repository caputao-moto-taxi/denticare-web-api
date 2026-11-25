import { AuthUser } from '../../../../auth/auth-user';
import { IAppointmentRepository } from '../../../domain/appointment.repository';
import {
  findScopedAppointment,
  requireAppointmentAccess,
  toAppointment,
} from '../shared/appointment-rules';

export type GetAppointmentInput = { user: AuthUser; id: string };

export class GetAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, id }: GetAppointmentInput) {
    const appointment = await findScopedAppointment(this.repository, user, id);
    requireAppointmentAccess(user, appointment);
    return toAppointment(appointment);
  }
}
