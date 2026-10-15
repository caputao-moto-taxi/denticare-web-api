import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AppointmentsPrismaRepository } from './appointments-prisma.repository';

describe('AppointmentsPrismaRepository scheduling', () => {
  const staff: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'secretary',
    branchId: 'branch-1',
    permissions: [
      'appointments.read.all',
      'appointments.create',
      'appointments.manage',
    ],
  };
  // Monday, 10:00 in the clinic (Africa/Luanda is UTC+1).
  const NOW = new Date('2026-03-02T09:00:00.000Z');
  const NEXT_MONDAY = '2026-03-09';

  const branch = {
    findFirst: jest.fn(),
  };
  const person = { findFirst: jest.fn() };
  const user = { findMany: jest.fn(), findFirst: jest.fn() };
  const tx = {
    $queryRaw: jest.fn(),
    appointment: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const appointment = { findMany: jest.fn(), findFirst: jest.fn() };
  const prisma = {
    branch,
    person,
    user,
    appointment,
    $transaction: jest.fn((callback: (client: unknown) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const repository = new AppointmentsPrismaRepository(prisma);

  const doctor = (id: string, profile: unknown = null) => ({
    id,
    createdAt: new Date(),
    doctorProfile: profile,
  });
  const created = (doctorId: string) => ({
    id: 'apt-1',
    date: new Date(`${NEXT_MONDAY}T00:00:00.000Z`),
    time: new Date(`${NEXT_MONDAY}T09:00:00.000Z`),
    reason: 'Checkup',
    description: null,
    status: 'CONFIRMED',
    patient: { id: 'patient-1', firstName: 'Ana', lastName: 'Costa' },
    doctor: {
      id: doctorId,
      email: `${doctorId}@example.test`,
      Person: [{ firstName: 'Dr', lastName: doctorId }],
      doctorProfile: null,
    },
  });
  const request = {
    patientId: 'patient-1',
    date: NEXT_MONDAY,
    time: '09:00',
    reason: 'Checkup',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: unknown) => unknown) => callback(tx),
    );
    // No configured hours, so the default clinic schedule applies.
    branch.findFirst.mockResolvedValue({
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    });
    person.findFirst.mockResolvedValue({ id: 'patient-1' });
    tx.appointment.findMany.mockResolvedValue([]);
    appointment.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  describe('create', () => {
    it('refuses dates that already passed in the clinic time zone', async () => {
      // 09:30 UTC is 10:30 in Luanda, so 10:00 today is already over.
      jest.setSystemTime(new Date('2026-03-02T09:30:00.000Z'));

      await expect(
        repository.create(staff, {
          ...request,
          date: '2026-03-02',
          time: '10:00',
          doctorId: 'd1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(person.findFirst).not.toHaveBeenCalled();
    });

    it('refuses times when the clinic is closed', async () => {
      await expect(
        repository.create(staff, {
          ...request,
          date: '2026-03-08', // Sunday
          doctorId: 'd1',
        }),
      ).rejects.toThrow('The clinic is closed at this time');
      await expect(
        repository.create(staff, { ...request, time: '13:00', doctorId: 'd1' }),
      ).rejects.toThrow('The clinic is closed at this time');
    });

    it('refuses a doctor outside their own schedule', async () => {
      user.findFirst.mockResolvedValue(
        doctor('d1', {
          workingDays: ['TER'],
          workingHours: { TER: { start: '09:00', end: '12:00' } },
        }),
      );

      await expect(
        repository.create(staff, { ...request, doctorId: 'd1' }),
      ).rejects.toThrow('Doctor is not available for this time slot');
    });

    it('books the chosen doctor when they are free', async () => {
      user.findFirst.mockResolvedValue(doctor('d1'));
      tx.appointment.create.mockResolvedValue(created('d1'));

      await expect(
        repository.create(staff, { ...request, doctorId: 'd1' }),
      ).resolves.toMatchObject({ doctorId: 'd1', status: 'confirmed' });
    });

    it('allocates the least busy free doctor when none is chosen', async () => {
      user.findMany.mockResolvedValue([doctor('d1'), doctor('d2')]);
      // d1 already has an appointment earlier that day, d2 has none.
      appointment.findMany.mockResolvedValue([
        { doctorId: 'd1', time: new Date(`${NEXT_MONDAY}T15:00:00.000Z`) },
      ]);
      tx.appointment.create.mockResolvedValue(created('d2'));

      await repository.create(staff, request);

      expect(tx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doctorId: 'd2' }),
        }),
      );
    });

    it('skips doctors who are busy at that time', async () => {
      user.findMany.mockResolvedValue([doctor('d1'), doctor('d2')]);
      appointment.findMany.mockResolvedValue([
        { doctorId: 'd2', time: new Date(`${NEXT_MONDAY}T09:00:00.000Z`) },
      ]);
      tx.appointment.create.mockResolvedValue(created('d1'));

      await repository.create(staff, request);

      expect(tx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doctorId: 'd1' }),
        }),
      );
    });

    it('falls back to the next doctor when the first one is taken meanwhile', async () => {
      user.findMany.mockResolvedValue([doctor('d1'), doctor('d2')]);
      tx.appointment.findMany
        .mockResolvedValueOnce([
          { time: new Date(`${NEXT_MONDAY}T09:00:00.000Z`) },
        ])
        .mockResolvedValueOnce([]);
      tx.appointment.create.mockResolvedValue(created('d2'));

      await repository.create(staff, request);

      expect(tx.appointment.create).toHaveBeenCalledTimes(1);
      expect(tx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doctorId: 'd2' }),
        }),
      );
    });

    it('fails when no doctor can take the slot', async () => {
      user.findMany.mockResolvedValue([doctor('d1')]);
      appointment.findMany.mockResolvedValue([
        { doctorId: 'd1', time: new Date(`${NEXT_MONDAY}T09:00:00.000Z`) },
      ]);

      await expect(repository.create(staff, request)).rejects.toThrow(
        'No doctor is available for this time slot',
      );
      expect(tx.appointment.create).not.toHaveBeenCalled();
    });

    it('requires the patient to belong to the clinic', async () => {
      person.findFirst.mockResolvedValue(null);

      await expect(
        repository.create(staff, { ...request, doctorId: 'd1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('availability', () => {
    it('returns the free slots of the selected doctor only', async () => {
      user.findMany.mockResolvedValue([
        doctor('d1', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:00', end: '10:30' } },
        }),
      ]);

      const result = (await repository.availability(staff, {
        date: NEXT_MONDAY,
        doctorId: 'd1',
      })) as {
        slots: { time: string; doctorIds: string[] }[];
        closed: boolean;
      };

      expect(user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'd1', branchId: 'branch-1' }),
        }),
      );
      expect(result.closed).toBe(false);
      expect(result.slots).toEqual([
        { time: '09:00', doctorIds: ['d1'] },
        { time: '09:30', doctorIds: ['d1'] },
        { time: '10:00', doctorIds: ['d1'] },
      ]);
    });

    it('merges every doctor when none is selected', async () => {
      user.findMany.mockResolvedValue([
        doctor('d1', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:00', end: '10:00' } },
        }),
        doctor('d2', {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:30', end: '11:00' } },
        }),
      ]);

      const result = (await repository.availability(staff, {
        date: NEXT_MONDAY,
      })) as { slots: { time: string; doctorIds: string[] }[]; doctorId: null };

      expect(result.doctorId).toBeNull();
      expect(result.slots).toEqual([
        { time: '09:00', doctorIds: ['d1'] },
        { time: '09:30', doctorIds: ['d1', 'd2'] },
        { time: '10:00', doctorIds: ['d2'] },
        { time: '10:30', doctorIds: ['d2'] },
      ]);
    });

    it('reports closed days and past days without slots', async () => {
      user.findMany.mockResolvedValue([doctor('d1')]);

      const sunday = (await repository.availability(staff, {
        date: '2026-03-08',
      })) as { closed: boolean; slots: unknown[] };
      const past = (await repository.availability(staff, {
        date: '2026-03-01',
      })) as { closed: boolean; slots: unknown[] };

      expect(sunday).toMatchObject({ closed: true, slots: [] });
      expect(past).toMatchObject({ closed: true, slots: [] });
    });

    it('fails for a doctor that is not part of the clinic', async () => {
      user.findMany.mockResolvedValue([]);

      await expect(
        repository.availability(staff, {
          date: NEXT_MONDAY,
          doctorId: 'foreign',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('keeps ConflictException semantics for taken slots', async () => {
    user.findFirst.mockResolvedValue(doctor('d1'));
    tx.appointment.findMany.mockResolvedValue([
      { time: new Date(`${NEXT_MONDAY}T09:00:00.000Z`) },
    ]);

    await expect(
      repository.create(staff, { ...request, doctorId: 'd1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('update', () => {
    const current = {
      ...created('d1'),
      patientId: 'patient-1',
      doctorId: 'd1',
      patient: {
        id: 'patient-1',
        userId: null,
        firstName: 'Ana',
        lastName: 'Costa',
      },
      doctor: {
        id: 'd1',
        email: 'd1@example.test',
        Person: [{ firstName: 'Dr', lastName: 'One' }],
        doctorProfile: null,
      },
    };
    const replacement = {
      id: 'patient-2',
      branchId: 'branch-1',
      deletedAt: null,
      Role: { slug: 'patient' },
    };

    it('updates patient, doctor, date, time, treatment and notes after validating the slot', async () => {
      appointment.findFirst.mockResolvedValue(current);
      person.findFirst.mockResolvedValue(replacement);
      user.findFirst.mockResolvedValue(doctor('d2'));
      tx.appointment.update.mockResolvedValue({
        ...created('d2'),
        patient: { id: 'patient-2', firstName: 'Joana', lastName: 'Silva' },
        reason: 'Crown',
        description: 'Bring previous x-ray',
      });

      await expect(
        repository.update(staff, 'apt-1', {
          patientId: 'patient-2',
          doctorId: 'd2',
          date: NEXT_MONDAY,
          time: '10:00',
          reason: ' Crown ',
          description: ' Bring previous x-ray ',
        }),
      ).resolves.toMatchObject({
        patientId: 'patient-2',
        doctorId: 'd2',
        reason: 'Crown',
        description: 'Bring previous x-ray',
      });

      expect(tx.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-1' },
          data: expect.objectContaining({
            patientId: 'patient-2',
            doctorId: 'd2',
            reason: 'Crown',
            description: 'Bring previous x-ray',
          }),
        }),
      );
      expect(tx.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'd2',
            status: { in: ['PENDING', 'CONFIRMED'] },
          }),
        }),
      );
    });

    it('allows editing details without moving an existing appointment out of its slot', async () => {
      appointment.findFirst.mockResolvedValue(current);
      person.findFirst.mockResolvedValue({ id: 'patient-1' });
      user.findFirst.mockResolvedValue(doctor('d1'));
      tx.appointment.update.mockResolvedValue({
        ...current,
        reason: 'Consultation',
      });

      await repository.update(staff, 'apt-1', {
        patientId: 'patient-1',
        doctorId: 'd1',
        date: NEXT_MONDAY,
        time: '09:00',
        reason: 'Consultation',
      });

      expect(tx.appointment.findMany).not.toHaveBeenCalled();
      expect(tx.appointment.update).toHaveBeenCalled();
    });

    it('does not let a patient edit a booking for another patient', async () => {
      appointment.findFirst.mockResolvedValue({
        ...current,
        patient: { ...current.patient, userId: 'patient-user' },
      });
      person.findFirst.mockResolvedValue(replacement);

      await expect(
        repository.update(
          { ...staff, role: 'patient', id: 'patient-user' },
          'apt-1',
          {
            patientId: 'patient-2',
            doctorId: 'd1',
            date: NEXT_MONDAY,
            time: '09:00',
            reason: 'Consultation',
          },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(user.findFirst).not.toHaveBeenCalled();
    });

    it('only allows pending and confirmed bookings to be edited', async () => {
      appointment.findFirst.mockResolvedValue({
        ...current,
        status: 'CANCELLED',
      });

      await expect(
        repository.update(staff, 'apt-1', {
          patientId: 'patient-1',
          doctorId: 'd1',
          date: NEXT_MONDAY,
          time: '09:00',
          reason: 'Consultation',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(person.findFirst).not.toHaveBeenCalled();
    });
  });

  it('excludes only the caller-scoped appointment from its own availability result', async () => {
    const current = {
      ...created('d1'),
      doctorId: 'd1',
      patientId: 'patient-1',
      patient: {
        id: 'patient-1',
        userId: null,
        firstName: 'Ana',
        lastName: 'Costa',
      },
      doctor: {
        id: 'd1',
        email: 'd1@example.test',
        Person: [{ firstName: 'Dr', lastName: 'One' }],
        doctorProfile: null,
      },
    };
    appointment.findFirst.mockResolvedValue(current);
    user.findMany.mockResolvedValue([doctor('d1')]);

    await repository.availability(staff, {
      doctorId: 'd1',
      date: NEXT_MONDAY,
      excludeAppointmentId: 'apt-1',
    });

    expect(appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 'apt-1' } }),
      }),
    );
  });
});
