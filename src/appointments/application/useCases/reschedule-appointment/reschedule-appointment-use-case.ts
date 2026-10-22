import { AuthUser } from '../../../../auth/auth-user';
import {
  IAppointmentRepository,
  RescheduleAppointmentCommand,
} from '../../../domain/appointment.repository';

export type RescheduleAppointmentInput = {
  user: AuthUser;
  id: string;
  input: RescheduleAppointmentCommand;
};

export class RescheduleAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, id, input }: RescheduleAppointmentInput) {
    return this.repository.reschedule(user, id, input);
  }
}
