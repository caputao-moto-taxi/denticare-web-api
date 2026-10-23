import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  Appointment,
  AppointmentConflictError,
  AppointmentId,
} from '../../../domain';
import { AppointmentsPrismaRepository } from './appointments-prisma.repository';

describe('AppointmentsPrismaRepository', () => {
  const ID = '3f2b8c1e-7d3a-4a52-9d57-0c1f0a6b9e11';
  const date = new Date('2026-03-09T00:00:00.000Z');
  const appointment = new Appointment({
    id: new AppointmentId(ID),
    patientId: 'patient-1',
    doctorId: 'd1',
    date,
    time: new Date('2026-03-09T09:00:00.000Z'),
    reason: 'Checkup',
    status: 'CONFIRMED',
    createdById: 'staff-1',
  });

  const tx = {
    $queryRaw: jest.fn(),
    appointment: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(),
    appointment: tx.appointment,
  } as unknown as PrismaService;
  const repository = new AppointmentsPrismaRepository(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: unknown) => unknown) => callback(tx),
    );
  });

  it('persists the aggregate as it is', async () => {
    await repository.insert(appointment);

    expect(tx.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: ID,
        status: 'CONFIRMED',
        patientId: 'patient-1',
        doctorId: 'd1',
        userId: 'staff-1',
      }),
    });
  });

  it('translates unique constraint violations into a slot conflict', async () => {
    tx.appointment.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(repository.insert(appointment)).rejects.toBeInstanceOf(
      AppointmentConflictError,
    );
  });

  it('lets other database failures through untouched', async () => {
    tx.appointment.create.mockRejectedValue(new Error('connection lost'));

    await expect(repository.insert(appointment)).rejects.toThrow(
      'connection lost',
    );
  });

  it('locks the doctor row and hands a transaction-bound repository to the action', async () => {
    tx.appointment.findMany.mockResolvedValue([]);

    await repository.runWithDoctorLock('d1', async (locked) => {
      await locked.findBookedSlots({ doctorIds: ['d1'], date });
    });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorId: { in: ['d1'] },
          date,
          status: { in: ['PENDING', 'CONFIRMED'] },
        }),
      }),
    );
  });

  it('scopes lookups to the branch for staff and to the owner for patients', async () => {
    tx.appointment.findFirst.mockResolvedValue(null);

    await repository.findById(new AppointmentId(ID), { branchId: 'b1' });
    await repository.findById(new AppointmentId(ID), {
      branchId: 'b1',
      patientUserId: 'u1',
    });

    expect(tx.appointment.findFirst.mock.calls[0][0].where).toEqual({
      id: ID,
      deletedAt: null,
      doctor: { branchId: 'b1' },
    });
    expect(tx.appointment.findFirst.mock.calls[1][0].where).toEqual({
      id: ID,
      deletedAt: null,
      patient: { branchId: 'b1', userId: 'u1' },
    });
  });
});
