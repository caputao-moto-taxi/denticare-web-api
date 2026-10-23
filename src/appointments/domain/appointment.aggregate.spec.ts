import {
  Appointment,
  AppointmentId,
  AppointmentRuleViolationError,
  AppointmentStatus,
} from './index';

describe('Appointment aggregate', () => {
  const date = new Date('2026-03-09T00:00:00.000Z');
  const time = new Date('2026-03-09T09:00:00.000Z');
  const command = {
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    date,
    time,
    reason: ' Checkup ',
    description: '  ',
    createdById: 'user-1',
  };
  const existing = (status: AppointmentStatus) =>
    new Appointment({
      id: new AppointmentId(),
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      date,
      time,
      reason: 'Checkup',
      status,
    });

  describe('create', () => {
    it('confirms the appointment and normalizes the free text', () => {
      const appointment = Appointment.create(command);

      expect(appointment.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointment.reason).toBe('Checkup');
      expect(appointment.description).toBeUndefined();
      expect(appointment.toJSON()).toMatchObject({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        createdById: 'user-1',
      });
    });

    it.each([
      ['an empty reason', { reason: '   ' }],
      ['a reason longer than 300 characters', { reason: 'a'.repeat(301) }],
      [
        'a description longer than 4000 characters',
        { description: 'a'.repeat(4001) },
      ],
      ['an invalid time', { time: new Date('invalid') }],
      ['a missing doctor', { doctorId: '' }],
    ])('rejects %s', (_, changes) => {
      expect(() => Appointment.create({ ...command, ...changes })).toThrow(
        AppointmentRuleViolationError,
      );
    });
  });

  describe('AppointmentId.parse', () => {
    it('reports malformed ids as not found', () => {
      expect(() => AppointmentId.parse('apt-1')).toThrow(
        'Appointment not found',
      );
    });
  });

  describe('status transitions', () => {
    it.each(['PENDING', 'CONFIRMED'] as const)(
      'cancels a %s appointment',
      (status) => {
        const appointment = existing(status);
        appointment.cancel();
        expect(appointment.status).toBe('CANCELLED');
      },
    );

    it.each(['CANCELLED', 'COMPLETED'] as const)(
      'refuses to cancel, reschedule or edit a %s appointment',
      (status) => {
        const appointment = existing(status);
        expect(() => appointment.cancel()).toThrow(
          'Only pending or confirmed appointments can be cancelled',
        );
        expect(() => appointment.reschedule(date, time)).toThrow(
          'Only pending or confirmed appointments can be rescheduled',
        );
        expect(() =>
          appointment.edit({
            patientId: 'patient-1',
            doctorId: 'doctor-1',
            date,
            time,
            reason: 'Checkup',
          }),
        ).toThrow('Only pending or confirmed appointments can be edited');
      },
    );

    it('only completes confirmed appointments', () => {
      expect(() => existing('PENDING').complete()).toThrow(
        'Only confirmed appointments can be completed',
      );
      const appointment = existing('CONFIRMED');
      appointment.complete();
      expect(appointment.status).toBe('COMPLETED');
    });

    it('confirms the appointment when it is rescheduled', () => {
      const appointment = existing('PENDING');
      const moved = new Date('2026-03-10T10:00:00.000Z');

      appointment.reschedule(new Date('2026-03-10T00:00:00.000Z'), moved);

      expect(appointment.status).toBe('CONFIRMED');
      expect(appointment.time).toEqual(moved);
    });
  });

  it('detects whether it already holds a slot', () => {
    const appointment = existing('CONFIRMED');

    expect(appointment.isScheduledAt('doctor-1', date, time)).toBe(true);
    expect(appointment.isScheduledAt('doctor-2', date, time)).toBe(false);
    expect(
      appointment.isScheduledAt(
        'doctor-1',
        date,
        new Date('2026-03-09T10:00:00.000Z'),
      ),
    ).toBe(false);
  });
});
