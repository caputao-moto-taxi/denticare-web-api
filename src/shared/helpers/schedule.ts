export const WEEKDAY_CODES = [
  'DOM',
  'SEG',
  'TER',
  'QUA',
  'QUI',
  'SEX',
  'SAB',
] as const;

export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type DaySchedule = {
  start: string;
  end: string;
  lunchStart?: string;
  lunchEnd?: string;
};

export type WeeklySchedule = {
  workingDays: string[];
  workingHours: Record<string, DaySchedule>;
};

export const DEFAULT_TIMEZONE = 'Africa/Luanda';

// Used by clinics that have not configured their opening hours yet.
export const DEFAULT_CLINIC_SCHEDULE: WeeklySchedule = {
  workingDays: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
  workingHours: {
    SEG: {
      start: '08:00',
      end: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    },
    TER: {
      start: '08:00',
      end: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    },
    QUA: {
      start: '08:00',
      end: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    },
    QUI: {
      start: '08:00',
      end: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    },
    SEX: {
      start: '08:00',
      end: '18:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    },
    SAB: { start: '08:00', end: '13:00' },
  },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

export function weekdayOf(date: Date): WeekdayCode {
  return WEEKDAY_CODES[date.getUTCDay()];
}

export function resolveClinicSchedule(branch: {
  workingDays: string[];
  workingHours: unknown;
}): WeeklySchedule {
  if (branch.workingDays.length === 0 || !branch.workingHours) {
    return DEFAULT_CLINIC_SCHEDULE;
  }
  return {
    workingDays: branch.workingDays,
    workingHours: branch.workingHours as Record<string, DaySchedule>,
  };
}

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Appointment dates and times are stored as wall-clock values in UTC columns, so
// "now" has to be expressed the same way before comparing.
export function clinicNow(timezone: string, at: Date = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map(({ type, value }) => [type, value]),
  ) as Record<string, string>;

  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  );
}

// Returns human-readable problems; an empty list means the schedule is usable.
export function validateWeeklySchedule(schedule: {
  workingDays: unknown;
  workingHours: unknown;
}): string[] {
  const problems: string[] = [];
  const { workingDays, workingHours } = schedule;

  if (
    !Array.isArray(workingDays) ||
    workingDays.length === 0 ||
    new Set(workingDays).size !== workingDays.length ||
    workingDays.some((day) => !WEEKDAY_CODES.includes(day as WeekdayCode))
  ) {
    return ['workingDays must list unique weekdays (DOM, SEG, ..., SAB)'];
  }
  if (typeof workingHours !== 'object' || workingHours === null) {
    return ['workingHours must be an object keyed by weekday'];
  }

  const hours = workingHours as Record<string, Partial<DaySchedule>>;
  for (const day of workingDays as string[]) {
    const range = hours[day];
    const start = range?.start ? timeToMinutes(range.start) : null;
    const end = range?.end ? timeToMinutes(range.end) : null;
    if (start === null || end === null || start >= end) {
      problems.push(
        `${day}: start and end must be HH:mm with start before end`,
      );
      continue;
    }

    const hasLunch = Boolean(range.lunchStart || range.lunchEnd);
    if (!hasLunch) continue;
    const lunchStart = range.lunchStart
      ? timeToMinutes(range.lunchStart)
      : null;
    const lunchEnd = range.lunchEnd ? timeToMinutes(range.lunchEnd) : null;
    if (
      lunchStart === null ||
      lunchEnd === null ||
      lunchStart >= lunchEnd ||
      lunchStart < start ||
      lunchEnd > end
    ) {
      problems.push(`${day}: lunch break must fit inside the opening hours`);
    }
  }
  return problems;
}
