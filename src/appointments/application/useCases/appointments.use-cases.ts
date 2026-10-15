import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  AppointmentAvailabilityQuery,
  CreateAppointmentCommand,
  IAppointmentRepository,
  RescheduleAppointmentCommand,
  UpdateAppointmentCommand,
} from '../../domain/appointment.repository';

export class AppointmentsUseCases {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.appointmentRepository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.appointmentRepository.findOne(user, id);
  }

  create(user: AuthUser, input: CreateAppointmentCommand) {
    return this.appointmentRepository.create(user, input);
  }

  cancel(user: AuthUser, id: string) {
    return this.appointmentRepository.cancel(user, id);
  }

  complete(user: AuthUser, id: string) {
    return this.appointmentRepository.complete(user, id);
  }

  reschedule(user: AuthUser, id: string, input: RescheduleAppointmentCommand) {
    return this.appointmentRepository.reschedule(user, id, input);
  }

  update(user: AuthUser, id: string, input: UpdateAppointmentCommand) {
    return this.appointmentRepository.update(user, id, input);
  }

  availability(user: AuthUser, query: AppointmentAvailabilityQuery) {
    return this.appointmentRepository.availability(user, query);
  }
}
