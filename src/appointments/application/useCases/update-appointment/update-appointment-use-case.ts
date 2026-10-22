import { AuthUser } from '../../../../auth/auth-user';
import {
  IAppointmentRepository,
  UpdateAppointmentCommand,
} from '../../../domain/appointment.repository';

export type UpdateAppointmentInput = {
  user: AuthUser;
  id: string;
  input: UpdateAppointmentCommand;
};

export class UpdateAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, id, input }: UpdateAppointmentInput) {
    return this.repository.update(user, id, input);
  }
}
