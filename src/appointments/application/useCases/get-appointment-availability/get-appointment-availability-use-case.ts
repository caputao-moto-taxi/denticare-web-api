import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  AppointmentAvailabilityQuery,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';
import {
  buildFreeSlots,
  doctorScheduleOrClinic,
} from '../../../appointment-time';
import { clinicNow, weekdayOf } from '../../../../shared/helpers/schedule';
import {
  busyAppointmentSlots,
  findScopedAppointment,
  loadAppointmentClinic,
  requireAppointmentAccess,
  STAFF_ROLES,
  toAppointmentDate,
} from '../shared/appointment-rules';

export type GetAppointmentAvailabilityInput = {
  user: AuthUser;
  query: AppointmentAvailabilityQuery;
};

export class GetAppointmentAvailabilityUseCase {
  constructor(private readonly repository: IAppointmentRepository) {}

  async execute({ user, query }: GetAppointmentAvailabilityInput) {
    if (!STAFF_ROLES.has(user.role) && user.role !== 'patient') {
      throw new ForbiddenException(
        'Clinic staff or patient access is required',
      );
    }
    const clinic = await loadAppointmentClinic(this.repository, user.branchId);
    const date = toAppointmentDate(query.date);
    let excludedAppointmentId: string | undefined;
    if (query.excludeAppointmentId) {
      const appointment = await findScopedAppointment(
        this.repository,
        user,
        query.excludeAppointmentId,
      );
      requireAppointmentAccess(user, appointment);
      excludedAppointmentId = appointment.id;
    }

    const doctors = (
      await this.repository.findDoctorsByBranch(user.branchId)
    ).filter(
      (doctor) =>
        !doctor.deletedAt &&
        doctor.isActive &&
        doctor.Role?.slug === 'doctor' &&
        (!query.doctorId || doctor.id === query.doctorId),
    );
    if (query.doctorId && doctors.length === 0) {
      throw new NotFoundException('Doctor not found in this clinic');
    }

    const appointments = await this.repository.findAppointmentsForDoctorsOnDate(
      doctors.map(({ id }) => id),
      date,
    );
    const booked = busyAppointmentSlots(appointments, excludedAppointmentId);
    const now = clinicNow(clinic.timezone);
    const slots = buildFreeSlots({
      date,
      clinic: clinic.schedule,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        schedule: doctorScheduleOrClinic(doctor.doctorProfile, clinic.schedule),
      })),
      booked,
      now,
    });

    const hours = clinic.schedule.workingHours[weekdayOf(date)];
    const dayStart = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const closed =
      date.getTime() < dayStart ||
      !clinic.schedule.workingDays.includes(weekdayOf(date)) ||
      !hours?.start ||
      !hours.end;

    return {
      date: query.date,
      doctorId: query.doctorId ?? null,
      closed,
      slots,
    };
  }
}
