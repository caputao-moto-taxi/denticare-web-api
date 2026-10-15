import {
  clinicNow,
  DEFAULT_CLINIC_SCHEDULE,
  isValidTimezone,
  resolveClinicSchedule,
  validateWeeklySchedule,
} from './schedule';

describe('schedule helpers', () => {
  describe('clinicNow', () => {
    it('expresses the instant as wall-clock time of the clinic zone', () => {
      const now = clinicNow('Africa/Luanda', new Date('2026-03-02T23:30:00Z'));

      expect(now.toISOString()).toBe('2026-03-03T00:30:00.000Z');
    });

    it('does not shift zones that are already on UTC', () => {
      const now = clinicNow('UTC', new Date('2026-03-02T10:15:30Z'));

      expect(now.toISOString()).toBe('2026-03-02T10:15:30.000Z');
    });
  });

  describe('resolveClinicSchedule', () => {
    it('falls back to the default opening hours when none were configured', () => {
      expect(
        resolveClinicSchedule({ workingDays: [], workingHours: null }),
      ).toBe(DEFAULT_CLINIC_SCHEDULE);
    });

    it('uses the configured schedule when present', () => {
      const workingHours = { SEG: { start: '09:00', end: '12:00' } };

      expect(
        resolveClinicSchedule({ workingDays: ['SEG'], workingHours }),
      ).toEqual({ workingDays: ['SEG'], workingHours });
    });
  });

  describe('validateWeeklySchedule', () => {
    const valid = {
      workingDays: ['SEG', 'SAB'],
      workingHours: {
        SEG: {
          start: '08:00',
          end: '18:00',
          lunchStart: '13:00',
          lunchEnd: '14:00',
        },
        SAB: { start: '08:00', end: '13:00' },
      },
    };

    it('accepts a well-formed schedule', () => {
      expect(validateWeeklySchedule(valid)).toEqual([]);
    });

    it('rejects unknown or repeated weekdays and empty lists', () => {
      expect(
        validateWeeklySchedule({ ...valid, workingDays: [] }),
      ).toHaveLength(1);
      expect(
        validateWeeklySchedule({ ...valid, workingDays: ['SEG', 'SEG'] }),
      ).toHaveLength(1);
      expect(
        validateWeeklySchedule({ ...valid, workingDays: ['MON'] }),
      ).toHaveLength(1);
    });

    it('requires opening hours for every working day', () => {
      const problems = validateWeeklySchedule({
        workingDays: ['SEG', 'TER'],
        workingHours: valid.workingHours,
      });

      expect(problems).toEqual([expect.stringContaining('TER')]);
    });

    it('rejects ranges that end before they start or use a bad format', () => {
      expect(
        validateWeeklySchedule({
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '18:00', end: '08:00' } },
        }),
      ).toHaveLength(1);
      expect(
        validateWeeklySchedule({
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '8am', end: '18:00' } },
        }),
      ).toHaveLength(1);
    });

    it('rejects lunch breaks outside the opening hours or incomplete', () => {
      expect(
        validateWeeklySchedule({
          workingDays: ['SEG'],
          workingHours: {
            SEG: {
              start: '08:00',
              end: '12:00',
              lunchStart: '12:00',
              lunchEnd: '13:00',
            },
          },
        }),
      ).toHaveLength(1);
      expect(
        validateWeeklySchedule({
          workingDays: ['SEG'],
          workingHours: {
            SEG: { start: '08:00', end: '18:00', lunchStart: '13:00' },
          },
        }),
      ).toHaveLength(1);
    });
  });

  it('validates IANA time zones', () => {
    expect(isValidTimezone('Africa/Luanda')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
  });
});
