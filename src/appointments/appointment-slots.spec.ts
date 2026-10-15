import {
  buildFreeSlots,
  doctorScheduleOrClinic,
  rankDoctorsByLoad,
} from './appointment-time';
import {
  DEFAULT_CLINIC_SCHEDULE,
  WeeklySchedule,
} from '../shared/helpers/schedule';

describe('buildFreeSlots', () => {
  const monday = new Date('2026-03-09T00:00:00.000Z');
  const now = new Date('2026-03-02T09:00:00.000Z');
  const clinic = DEFAULT_CLINIC_SCHEDULE;
  const anyDoctor = (id: string, schedule: WeeklySchedule = clinic) => ({
    id,
    schedule,
  });
  const times = (slots: { time: string }[]) => slots.map((slot) => slot.time);

  it('follows the clinic opening hours and skips the lunch break', () => {
    const slots = buildFreeSlots({
      date: monday,
      clinic,
      doctors: [anyDoctor('d1')],
      booked: [],
      now,
    });

    expect(slots[0].time).toBe('08:00');
    expect(slots[slots.length - 1].time).toBe('17:30');
    expect(times(slots)).not.toContain('13:00');
    expect(times(slots)).not.toContain('13:30');
    expect(times(slots)).toContain('14:00');
  });

  it('keeps only the slots inside the doctor schedule', () => {
    const doctor = anyDoctor('d1', {
      workingDays: ['SEG'],
      workingHours: { SEG: { start: '09:00', end: '11:00' } },
    });

    const slots = buildFreeSlots({
      date: monday,
      clinic,
      doctors: [doctor],
      booked: [],
      now,
    });

    expect(times(slots)).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('never offers hours the clinic is closed even if the doctor works them', () => {
    const doctor = anyDoctor('d1', {
      workingDays: ['SEG'],
      workingHours: { SEG: { start: '06:00', end: '20:00' } },
    });

    const slots = buildFreeSlots({
      date: monday,
      clinic,
      doctors: [doctor],
      booked: [],
      now,
    });

    expect(slots[0].time).toBe('08:00');
    expect(slots[slots.length - 1].time).toBe('17:30');
  });

  it('removes booked slots per doctor and lists every free doctor', () => {
    const slots = buildFreeSlots({
      date: monday,
      clinic,
      doctors: [anyDoctor('d1'), anyDoctor('d2')],
      booked: [{ doctorId: 'd1', time: new Date('2026-03-09T09:00:00.000Z') }],
      now,
    });

    expect(slots.find((slot) => slot.time === '09:00')?.doctorIds).toEqual([
      'd2',
    ]);
    expect(slots.find((slot) => slot.time === '09:30')?.doctorIds).toEqual([
      'd1',
      'd2',
    ]);
  });

  it('drops a slot when every doctor is busy', () => {
    const slots = buildFreeSlots({
      date: monday,
      clinic,
      doctors: [anyDoctor('d1')],
      booked: [{ doctorId: 'd1', time: new Date('2026-03-09T09:00:00.000Z') }],
      now,
    });

    expect(times(slots)).not.toContain('09:00');
  });

  it('offers nothing on closed days or days that already passed', () => {
    const sunday = new Date('2026-03-08T00:00:00.000Z');
    const yesterday = new Date('2026-03-01T00:00:00.000Z');

    expect(
      buildFreeSlots({
        date: sunday,
        clinic,
        doctors: [anyDoctor('d1')],
        booked: [],
        now,
      }),
    ).toEqual([]);
    expect(
      buildFreeSlots({
        date: yesterday,
        clinic,
        doctors: [anyDoctor('d1')],
        booked: [],
        now,
      }),
    ).toEqual([]);
  });

  it('hides the hours that already passed today', () => {
    const today = new Date('2026-03-02T00:00:00.000Z');

    const slots = buildFreeSlots({
      date: today,
      clinic,
      doctors: [anyDoctor('d1')],
      booked: [],
      now,
    });

    expect(slots[0].time).toBe('09:30');
  });
});

describe('doctorScheduleOrClinic', () => {
  it('uses the clinic schedule for doctors without configured hours', () => {
    expect(doctorScheduleOrClinic(null, DEFAULT_CLINIC_SCHEDULE)).toBe(
      DEFAULT_CLINIC_SCHEDULE,
    );
    expect(
      doctorScheduleOrClinic(
        { workingDays: [], workingHours: null },
        DEFAULT_CLINIC_SCHEDULE,
      ),
    ).toBe(DEFAULT_CLINIC_SCHEDULE);
  });

  it('prefers the doctor schedule when configured', () => {
    const workingHours = { TER: { start: '10:00', end: '12:00' } };

    expect(
      doctorScheduleOrClinic(
        { workingDays: ['TER'], workingHours },
        DEFAULT_CLINIC_SCHEDULE,
      ),
    ).toEqual({ workingDays: ['TER'], workingHours });
  });
});

describe('rankDoctorsByLoad', () => {
  it('puts the least busy doctor first and breaks ties by id', () => {
    const ranked = rankDoctorsByLoad(
      ['b', 'c', 'a'],
      [{ doctorId: 'a' }, { doctorId: 'a' }, { doctorId: 'b' }],
    );

    expect(ranked).toEqual(['c', 'b', 'a']);
  });
});
