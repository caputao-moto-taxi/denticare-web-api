import { clinicNow, WeeklySchedule } from '../../shared/helpers/schedule';
import {
  AppointmentConflictError,
  AppointmentRuleViolationError,
} from './appointment.errors';
import {
  doctorScheduleOrClinic,
  hasAppointmentConflict,
  isDoctorWorkingSlot,
} from './appointment-time';

export type DoctorWorkingProfile = {
  workingDays: string[];
  workingHours: unknown;
};

export function parseAppointmentDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppointmentRuleViolationError('Invalid date');
  }
  return date;
}

export function parseAppointmentDateTime(dateValue: string, timeValue: string) {
  const date = parseAppointmentDate(dateValue);
  const time = new Date(`${dateValue}T${timeValue}:00.000Z`);
  if (Number.isNaN(time.getTime())) {
    throw new AppointmentRuleViolationError('Invalid appointment date or time');
  }
  return { date, time };
}

export function assertNotInThePast(time: Date, timezone: string): void {
  if (time <= clinicNow(timezone)) {
    throw new AppointmentRuleViolationError(
      'Appointment must be in the future',
    );
  }
}

export function assertClinicOpen(
  date: Date,
  time: string,
  clinic: WeeklySchedule,
): void {
  if (
    !isDoctorWorkingSlot(date, time, clinic.workingDays, clinic.workingHours)
  ) {
    throw new AppointmentConflictError('The clinic is closed at this time');
  }
}

export function assertDoctorAvailable(
  profile: DoctorWorkingProfile | null,
  clinic: WeeklySchedule,
  date: Date,
  time: string,
): void {
  const schedule = doctorScheduleOrClinic(profile, clinic);
  if (
    !isDoctorWorkingSlot(
      date,
      time,
      schedule.workingDays,
      schedule.workingHours,
    )
  ) {
    throw new AppointmentConflictError(
      'Doctor is not available for this time slot',
    );
  }
}

export function assertSlotIsFree(time: Date, scheduledStarts: Date[]): void {
  if (hasAppointmentConflict(time, scheduledStarts)) {
    throw new AppointmentConflictError(
      'Doctor is already booked for this time slot',
    );
  }
}
