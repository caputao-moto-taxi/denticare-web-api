import { AuthUser } from '../../../../auth/auth-user';
import {
  AppointmentAvailabilityQuery,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';

export type GetAppointmentAvailabilityInput = {
  user: AuthUser;
  query: AppointmentAvailabilityQuery;
};

export class GetAppointmentAvailabilityUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  execute({ user, query }: GetAppointmentAvailabilityInput) {
    return this.repository.availability(user, query);
  }
}
