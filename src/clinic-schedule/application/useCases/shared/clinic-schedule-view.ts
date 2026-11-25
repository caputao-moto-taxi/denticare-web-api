import { APPOINTMENT_SLOT_DURATION_MS } from '../../../../appointments/appointment-time';
import { ClinicScheduleRecord } from '../../../domain/clinic-schedule.repository';
import { resolveClinicSchedule } from '../../../../shared/helpers/schedule';

export function toClinicScheduleView(branch: ClinicScheduleRecord) {
  const schedule = resolveClinicSchedule(branch);
  return {
    workingDays: schedule.workingDays,
    workingHours: schedule.workingHours,
    timezone: branch.timezone,
    slotDurationMinutes: APPOINTMENT_SLOT_DURATION_MS / 60_000,
    isDefault: branch.workingDays.length === 0 || !branch.workingHours,
  };
}
