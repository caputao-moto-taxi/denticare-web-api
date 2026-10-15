import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';
export type CreateAppointmentCommand = {
  patientId: string;
  // Omitted when the clinic should pick any doctor who is free.
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  description?: string;
};

export type RescheduleAppointmentCommand = { date: string; time: string };
export type UpdateAppointmentCommand = Omit<
  CreateAppointmentCommand,
  'doctorId'
> & { doctorId: string };
export type AppointmentAvailabilityQuery = {
  doctorId?: string;
  date: string;
  excludeAppointmentId?: string;
};

export abstract class IAppointmentRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract create(
    user: AuthUser,
    input: CreateAppointmentCommand,
  ): Promise<unknown>;
  abstract cancel(user: AuthUser, id: string): Promise<unknown>;
  abstract complete(user: AuthUser, id: string): Promise<unknown>;
  abstract reschedule(
    user: AuthUser,
    id: string,
    input: RescheduleAppointmentCommand,
  ): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: UpdateAppointmentCommand,
  ): Promise<unknown>;
  abstract availability(
    user: AuthUser,
    query: AppointmentAvailabilityQuery,
  ): Promise<unknown>;
}
