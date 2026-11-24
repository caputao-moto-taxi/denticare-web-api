import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { hasPermission } from '../../../../auth/permissions';
import {
  AppointmentDoctorRecord,
  AppointmentRecord,
  AppointmentSlotConflictError,
  AppointmentSlotRecord,
  CreateAppointmentData,
  IAppointmentRepository,
} from '../../../domain/appointment.repository';
import {
  doctorScheduleOrClinic,
  hasAppointmentConflict,
  isDoctorWorkingSlot,
} from '../../../appointment-time';
import {
  clinicNow,
  resolveClinicSchedule,
  WeeklySchedule,
} from '../../../../shared/helpers/schedule';

export const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);

const BUSY_STATUSES = new Set(['PENDING', 'CONFIRMED']);

export type AppointmentClinic = {
  schedule: WeeklySchedule;
  timezone: string;
};

export async function loadAppointmentClinic(
  repository: IAppointmentRepository,
  branchId: string,
): Promise<AppointmentClinic> {
  const branch = await repository.findBranchSchedule(branchId);
  if (!branch || branch.deletedAt) {
    throw new NotFoundException('Clinic not found');
  }
  return {
    schedule: resolveClinicSchedule(branch),
    timezone: branch.timezone,
  };
}

export async function findScopedAppointment(
  repository: IAppointmentRepository,
  user: AuthUser,
  id: string,
): Promise<AppointmentRecord> {
  const appointment = await repository.findAppointmentById(id);
  if (!appointment || appointment.deletedAt) {
    throw new NotFoundException('Appointment not found');
  }

  const isInUserScope = STAFF_ROLES.has(user.role)
    ? appointment.doctor.branchId === user.branchId
    : appointment.patient.branchId === user.branchId &&
      appointment.patient.userId === user.id;
  if (!isInUserScope) {
    throw new NotFoundException('Appointment not found');
  }
  return appointment;
}

export function requireAppointmentAccess(
  user: AuthUser,
  appointment: AppointmentRecord,
) {
  if (user.role === 'patient') {
    if (appointment.patient.userId !== user.id) {
      throw new ForbiddenException('You cannot access this appointment');
    }
    return;
  }
  if (
    hasPermission(user, 'appointments.read.all') ||
    hasPermission(user, 'appointments.manage')
  ) {
    return;
  }
  if (
    hasPermission(user, 'appointments.read.assigned') &&
    appointment.doctorId === user.id
  ) {
    return;
  }
  throw new ForbiddenException('You cannot access this appointment');
}

export function requireClinicStaff(user: AuthUser) {
  if (!STAFF_ROLES.has(user.role)) {
    throw new ForbiddenException('Clinic staff access is required');
  }
}

export function toAppointment(appointment: AppointmentRecord) {
  const doctorName = appointment.doctor.Person[0]
    ? `${appointment.doctor.Person[0].firstName} ${appointment.doctor.Person[0].lastName}`.trim()
    : appointment.doctor.email;
  return {
    id: appointment.id,
    date: appointment.date.toISOString().slice(0, 10),
    time: appointment.time.toISOString().slice(11, 16),
    patientId: appointment.patient.id,
    patientName:
      `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim(),
    doctorId: appointment.doctor.id,
    doctorName,
    specialty: appointment.doctor.doctorProfile?.specialties[0] ?? '',
    reason: appointment.reason,
    description: appointment.description ?? '',
    status: appointment.status.toLowerCase(),
  };
}

export function toAppointmentDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return date;
}

export function toAppointmentDateTime(dateValue: string, timeValue: string) {
  const date = toAppointmentDate(dateValue);
  const time = new Date(`${dateValue}T${timeValue}:00.000Z`);
  if (Number.isNaN(time.getTime())) {
    throw new BadRequestException('Invalid appointment date or time');
  }
  return { date, time };
}

export function assertAppointmentIsFuture(time: Date, timezone: string) {
  if (time <= clinicNow(timezone)) {
    throw new BadRequestException('Appointment must be in the future');
  }
}

export function assertClinicIsOpen(
  date: Date,
  time: string,
  schedule: WeeklySchedule,
) {
  if (
    !isDoctorWorkingSlot(
      date,
      time,
      schedule.workingDays,
      schedule.workingHours,
    )
  ) {
    throw new ConflictException('The clinic is closed at this time');
  }
}

export function assertDoctorIsAvailable(
  doctor: Pick<AppointmentDoctorRecord, 'doctorProfile'>,
  clinic: WeeklySchedule,
  date: Date,
  time: string,
) {
  const schedule = doctorScheduleOrClinic(doctor.doctorProfile, clinic);
  if (
    !isDoctorWorkingSlot(
      date,
      time,
      schedule.workingDays,
      schedule.workingHours,
    )
  ) {
    throw new ConflictException('Doctor is not available for this time slot');
  }
}

export function busyAppointmentSlots(
  appointments: AppointmentSlotRecord[],
  excludedAppointmentId?: string,
): AppointmentSlotRecord[] {
  return appointments.filter(
    (appointment) =>
      appointment.deletedAt === null &&
      BUSY_STATUSES.has(appointment.status) &&
      appointment.id !== excludedAppointmentId,
  );
}

export async function assertAppointmentSlotIsFree(
  repository: IAppointmentRepository,
  doctorId: string,
  date: Date,
  time: Date,
  excludedAppointmentId?: string,
) {
  const booked = busyAppointmentSlots(
    await repository.findAppointmentsForDoctorOnDate(doctorId, date),
    excludedAppointmentId,
  );
  if (
    hasAppointmentConflict(
      time,
      booked.map(({ time: bookedTime }) => bookedTime),
    )
  ) {
    throw new ConflictException('Doctor is already booked for this time slot');
  }
}

export async function createAppointmentWithSlotLock(
  repository: IAppointmentRepository,
  data: CreateAppointmentData,
): Promise<AppointmentRecord> {
  try {
    return await repository.transaction(async (transaction) => {
      await transaction.lockDoctorForAppointment(data.doctorId);
      await assertAppointmentSlotIsFree(
        transaction,
        data.doctorId,
        data.date,
        data.time,
      );
      return transaction.createAppointment(data);
    });
  } catch (error) {
    if (error instanceof AppointmentSlotConflictError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }
}
