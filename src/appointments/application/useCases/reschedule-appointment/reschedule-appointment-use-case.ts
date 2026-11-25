import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IAppointmentRepository,
  RescheduleAppointmentCommand,
} from '../../../domain/appointment.repository';
import {
  assertAppointmentIsFuture,
  assertAppointmentSlotIsFree,
  assertClinicIsOpen,
  assertDoctorIsAvailable,
  findScopedAppointment,
  loadAppointmentClinic,
  requireAppointmentAccess,
  toAppointment,
  toAppointmentDateTime,
} from '../shared/appointment-rules';

export type RescheduleAppointmentInput = {
  user: AuthUser;
  id: string;
  input: RescheduleAppointmentCommand;
};

export class RescheduleAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, id, input }: RescheduleAppointmentInput) {
    const current = await findScopedAppointment(this.repository, user, id);
    requireAppointmentAccess(user, current);
    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be rescheduled',
      );
    }

    const clinic = await loadAppointmentClinic(this.repository, user.branchId);
    const { date, time } = toAppointmentDateTime(input.date, input.time);
    assertAppointmentIsFuture(time, clinic.timezone);
    assertClinicIsOpen(date, input.time, clinic.schedule);

    assertDoctorIsAvailable(current.doctor, clinic.schedule, date, input.time);

    const updated = await this.repository.transaction(async (transaction) => {
      await transaction.lockDoctorForAppointment(current.doctorId);
      await assertAppointmentSlotIsFree(
        transaction,
        current.doctorId,
        date,
        time,
        id,
      );
      return transaction.updateAppointment(id, {
        date,
        time,
        status: 'CONFIRMED',
      });
    });
    return toAppointment(updated);
  }
}
