import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  CreateAppointmentCommand,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';
import {
  buildFreeSlots,
  doctorScheduleOrClinic,
  rankDoctorsByLoad,
} from '../../../appointment-time';
import { clinicNow } from '../../../../shared/helpers/schedule';
import {
  assertAppointmentIsFuture,
  assertClinicIsOpen,
  assertDoctorIsAvailable,
  busyAppointmentSlots,
  createAppointmentWithSlotLock,
  loadAppointmentClinic,
  STAFF_ROLES,
  toAppointment,
  toAppointmentDateTime,
} from '../shared/appointment-rules';

export type CreateAppointmentInput = {
  user: AuthUser;
  input: CreateAppointmentCommand;
};

export class CreateAppointmentUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, input }: CreateAppointmentInput) {
    if (!STAFF_ROLES.has(user.role) && user.role !== 'patient') {
      throw new ForbiddenException(
        'Clinic staff or patient access is required',
      );
    }

    const { date, time } = toAppointmentDateTime(input.date, input.time);
    const clinic = await loadAppointmentClinic(this.repository, user.branchId);
    assertAppointmentIsFuture(time, clinic.timezone);
    assertClinicIsOpen(date, input.time, clinic.schedule);

    const patient =
      user.role === 'patient'
        ? await this.repository.findPatientByUserId(user.id, user.branchId)
        : await this.repository.findPatientById(input.patientId);
    if (
      !patient ||
      patient.deletedAt ||
      patient.branchId !== user.branchId ||
      patient.Role?.slug !== 'patient'
    ) {
      throw new NotFoundException('Patient not found in this clinic');
    }

    const booking = {
      date,
      time,
      reason: input.reason.trim(),
      description: input.description?.trim(),
      status: 'CONFIRMED' as const,
      patientId: patient.id,
      userId: user.id,
    };

    if (input.doctorId) {
      const doctor = await this.repository.findDoctorById(input.doctorId);
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
      const appointment = await createAppointmentWithSlotLock(this.repository, {
        ...booking,
        doctorId: doctor.id,
      });
      return toAppointment(appointment);
    }

    const doctors = (await this.repository.findDoctorsByBranch(user.branchId))
      .filter(
        (doctor) =>
          !doctor.deletedAt &&
          doctor.isActive &&
          doctor.Role?.slug === 'doctor',
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const appointments = await this.repository.findAppointmentsForDoctorsOnDate(
      doctors.map(({ id }) => id),
      date,
    );
    const booked = busyAppointmentSlots(appointments);
    const slot = buildFreeSlots({
      date,
      clinic: clinic.schedule,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        schedule: doctorScheduleOrClinic(doctor.doctorProfile, clinic.schedule),
      })),
      booked,
      now: clinicNow(clinic.timezone),
    }).find((item) => item.time === input.time);

    for (const doctorId of rankDoctorsByLoad(slot?.doctorIds ?? [], booked)) {
      try {
        const appointment = await createAppointmentWithSlotLock(
          this.repository,
          { ...booking, doctorId },
        );
        return toAppointment(appointment);
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    throw new ConflictException('No doctor is available for this time slot');
  }
}
