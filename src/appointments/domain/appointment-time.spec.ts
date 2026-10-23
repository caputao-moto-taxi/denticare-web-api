import {
  hasAppointmentConflict,
  isDoctorWorkingSlot,
} from './appointment-time';

describe('appointment slot rules', () => {
  it('rejects overlapping slots but allows adjacent slots', () => {
    const booked = [new Date('2026-10-15T09:00:00.000Z')];

    expect(
      hasAppointmentConflict(new Date('2026-10-15T09:15:00.000Z'), booked),
    ).toBe(true);
    expect(
      hasAppointmentConflict(new Date('2026-10-15T09:30:00.000Z'), booked),
    ).toBe(false);
  });

  it('requires the date, opening hours, and break window to allow the slot', () => {
    const date = new Date('2026-10-15T00:00:00.000Z');
    const days = ['QUI'];
    const hours = {
      QUI: {
        start: '09:00',
        end: '17:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
      },
    };

    expect(isDoctorWorkingSlot(date, '09:00', days, hours)).toBe(true);
    expect(isDoctorWorkingSlot(date, '12:00', days, hours)).toBe(false);
    expect(isDoctorWorkingSlot(date, '16:45', days, hours)).toBe(false);
    expect(isDoctorWorkingSlot(date, '09:00', ['SEX'], hours)).toBe(false);
  });
});
