import { AuthUser } from '../../../auth/auth-user';
import {
  assertCanAccess,
  Appointment,
  AppointmentId,
  AppointmentNotFoundError,
  AppointmentView,
  IAppointmentRepository,
  scopeFor,
} from '../../domain';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from './appointment.output';

export async function findAccessibleAppointment(
  repository: IAppointmentRepository,
  user: AuthUser,
  id: string,
): Promise<Appointment> {
  const appointment = await repository.findById(
    AppointmentId.parse(id),
    scopeFor(user),
  );
  if (!appointment) throw new AppointmentNotFoundError('Appointment not found');
  assertCanAccess(user, appointment);
  return appointment;
}

export async function findAppointmentView(
  repository: IAppointmentRepository,
  user: AuthUser,
  id: AppointmentId,
): Promise<AppointmentView> {
  const view = await repository.findViewById(id, scopeFor(user));
  if (!view) throw new AppointmentNotFoundError('Appointment not found');
  return view;
}

export async function findAppointmentOutput(
  repository: IAppointmentRepository,
  user: AuthUser,
  id: AppointmentId,
): Promise<AppointmentOutput> {
  return AppointmentOutputMapper.toOutput(
    await findAppointmentView(repository, user, id),
  );
}
