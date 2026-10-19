import { AuthUser } from '../../../../auth/auth-user';
import {
  CreateAppointmentCommand,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';

export type CreateAppointmentInput = {
  user: AuthUser;
  input: CreateAppointmentCommand;
};

export class CreateAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, input }: CreateAppointmentInput) {
    return this.repository.create(user, input);
  }
}
