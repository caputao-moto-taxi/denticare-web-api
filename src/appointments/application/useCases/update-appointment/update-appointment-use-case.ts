import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IAppointmentRepository,
  UpdateAppointmentCommand,
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

export type UpdateAppointmentInput = {
  user: AuthUser;
  id: string;
  input: UpdateAppointmentCommand;
};

export class UpdateAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, id, input }: UpdateAppointmentInput) {
    const current = await findScopedAppointment(this.repository, user, id);
    requireAppointmentAccess(user, current);
    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be edited',
      );
    }
    if (user.role === 'patient' && input.patientId !== current.patientId) {
      throw new ForbiddenException(
        'Patients cannot change the appointment patient',
      );
    }
    if (user.role === 'doctor' && input.doctorId !== current.doctorId) {
      throw new ForbiddenException('Doctors cannot reassign appointments');
    }

    const clinic = await loadAppointmentClinic(this.repository, user.branchId);
    const { date, time } = toAppointmentDateTime(input.date, input.time);
    assertAppointmentIsFuture(time, clinic.timezone);
    assertClinicIsOpen(date, input.time, clinic.schedule);

    const [patient, doctor] = await Promise.all([
      this.repository.findPatientById(input.patientId),
      this.repository.findDoctorById(input.doctorId),
    ]);
    if (
      !patient ||
      patient.deletedAt ||
      patient.branchId !== user.branchId ||
      patient.Role?.slug !== 'patient'
    ) {
      throw new NotFoundException('Patient not found in this clinic');
    }
    if (
      !doctor ||
      doctor.deletedAt ||
      doctor.branchId !== user.branchId ||
      !doctor.isActive ||
      doctor.Role?.slug !== 'doctor'
    ) {
      throw new NotFoundException('Doctor not found in this clinic');
    }
    assertDoctorIsAvailable(doctor, clinic.schedule, date, input.time);

    const slotChanged =
      current.doctorId !== doctor.id ||
      current.date.getTime() !== date.getTime() ||
      current.time.getTime() !== time.getTime();
    const updateData = {
      patientId: patient.id,
      doctorId: doctor.id,
      date,
      time,
      reason: input.reason.trim(),
      description: input.description?.trim(),
    };

    if (!slotChanged) {
      return toAppointment(
        await this.repository.updateAppointment(id, updateData),
      );
    }

    const updated = await this.repository.transaction(async (transaction) => {
      await transaction.lockDoctorForAppointment(doctor.id);
      await assertAppointmentSlotIsFree(transaction, doctor.id, date, time, id);
      return transaction.updateAppointment(id, updateData);
    });
    return toAppointment(updated);
  }
}
