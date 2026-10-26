import {
  minutesToTime,
  timeToMinutes,
  WeeklySchedule,
  weekdayOf,
} from '../shared/helpers/schedule';

export const APPOINTMENT_SLOT_DURATION_MS = 30 * 60 * 1000;

export function hasAppointmentConflict(
  start: Date,
  scheduledStarts: Date[],
): boolean {
  const startMs = start.getTime();
  return scheduledStarts.some((scheduledStart) => {
    const scheduledStartMs = scheduledStart.getTime();
    return (
      startMs < scheduledStartMs + APPOINTMENT_SLOT_DURATION_MS &&
      startMs + APPOINTMENT_SLOT_DURATION_MS > scheduledStartMs
    );
  });
}

export function isDoctorWorkingSlot(
  date: Date,
  time: string,
  workingDays: string[],
  workingHours: unknown,
): boolean {
  const weekday = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'][
    date.getUTCDay()
  ];
  if (!workingDays.includes(weekday)) return false;

  const ranges = workingHours as Record<
    string,
    {
      start?: string;
      end?: string;
      lunchStart?: string;
      lunchEnd?: string;
    }
  > | null;
  const range = ranges?.[weekday];
  if (!range?.start || !range.end) return false;

  const toMinutes = (value: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(time);
  const rangeStart = toMinutes(range.start);
  const rangeEnd = toMinutes(range.end);
  if (start === null || rangeStart === null || rangeEnd === null) return false;
  const end = start + APPOINTMENT_SLOT_DURATION_MS / 60_000;
  if (start < rangeStart || end > rangeEnd) return false;

  if (range.lunchStart && range.lunchEnd) {
    const lunchStart = toMinutes(range.lunchStart);
    const lunchEnd = toMinutes(range.lunchEnd);
    if (lunchStart === null || lunchEnd === null) return false;
    if (start < lunchEnd && end > lunchStart) return false;
  } else if (range.lunchStart || range.lunchEnd) {
    return false;
  }

  return true;
}

export type SlotDoctor = { id: string; schedule: WeeklySchedule };
export type FreeSlot = { time: string; doctorIds: string[] };

export function doctorScheduleOrClinic(
  profile: { workingDays: string[]; workingHours: unknown } | null,
  clinic: WeeklySchedule,
): WeeklySchedule {
  if (!profile || profile.workingDays.length === 0 || !profile.workingHours) {
    return clinic;
  }
  return {
    workingDays: profile.workingDays,
    workingHours: profile.workingHours as WeeklySchedule['workingHours'],
  };
}

export function atTime(date: Date, time: string): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T${time}:00.000Z`);
}

export function buildFreeSlots(input: {
  date: Date;
  clinic: WeeklySchedule;
  doctors: SlotDoctor[];
  booked: { doctorId: string; time: Date }[];
  now: Date;
}): FreeSlot[] {
  const { date, clinic, doctors, booked, now } = input;
  const dayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (date.getTime() < dayStart) return [];

  const hours = clinic.workingHours[weekdayOf(date)];
  const open = hours?.start ? timeToMinutes(hours.start) : null;
  const close = hours?.end ? timeToMinutes(hours.end) : null;
  if (
    !clinic.workingDays.includes(weekdayOf(date)) ||
    open === null ||
    close === null
  ) {
    return [];
  }

  const step = APPOINTMENT_SLOT_DURATION_MS / 60_000;
  const slots: FreeSlot[] = [];
  for (let minutes = open; minutes + step <= close; minutes += step) {
    const time = minutesToTime(minutes);
    const start = atTime(date, time);
    if (start <= now) continue;
    if (
      !isDoctorWorkingSlot(date, time, clinic.workingDays, clinic.workingHours)
    ) {
      continue;
    }

    const doctorIds = doctors
      .filter(
        (doctor) =>
          isDoctorWorkingSlot(
            date,
            time,
            doctor.schedule.workingDays,
            doctor.schedule.workingHours,
          ) &&
          !hasAppointmentConflict(
            start,
            booked
              .filter((item) => item.doctorId === doctor.id)
              .map((item) => item.time),
          ),
      )
      .map((doctor) => doctor.id);
    if (doctorIds.length > 0) slots.push({ time, doctorIds });
  }
  return slots;
}

export function rankDoctorsByLoad(
  doctorIds: string[],
  booked: { doctorId: string }[],
): string[] {
  const load = new Map<string, number>();
  for (const { doctorId } of booked) {
    load.set(doctorId, (load.get(doctorId) ?? 0) + 1);
  }
  return [...doctorIds].sort(
    (a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0) || a.localeCompare(b),
  );
}
