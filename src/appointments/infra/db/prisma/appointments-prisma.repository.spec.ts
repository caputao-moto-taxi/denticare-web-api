import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AppointmentsPrismaRepository } from './appointments-prisma.repository';

describe('AppointmentsPrismaRepository', () => {
  const appointment = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    appointment,
  } as unknown as PrismaService;
  const repository = new AppointmentsPrismaRepository(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('maps application criteria to a paginated database query', async () => {
    appointment.findMany.mockResolvedValue([]);
    appointment.count.mockResolvedValue(0);
    const dateFrom = new Date('2026-03-01T00:00:00.000Z');
    const dateToExclusive = new Date('2026-04-01T00:00:00.000Z');
    const criteria = {
      branchId: 'branch-1',
      doctorScopeId: 'doctor-1',
      patientId: 'patient-1',
      status: 'CONFIRMED' as const,
      dateFrom,
      dateToExclusive,
      search: 'Ana Costa',
      skip: 10,
      take: 10,
    };

    await expect(repository.findAppointments(criteria)).resolves.toEqual({
      appointments: [],
      total: 0,
    });

    const where = expect.objectContaining({
      deletedAt: null,
      doctor: { branchId: 'branch-1' },
      date: { gte: dateFrom, lt: dateToExclusive },
      status: 'CONFIRMED',
      AND: [{ patientId: 'patient-1' }, { doctorId: 'doctor-1' }],
    });
    expect(appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
      }),
    );
    expect(appointment.count).toHaveBeenCalledWith({ where });
  });

  it('returns all statuses and soft-delete states for application-level slot rules', async () => {
    appointment.findMany.mockResolvedValue([]);
    const date = new Date('2026-03-09T00:00:00.000Z');

    await repository.findAppointmentsForDoctorOnDate('doctor-1', date);

    expect(appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { doctorId: 'doctor-1', date },
        select: {
          id: true,
          doctorId: true,
          time: true,
          status: true,
          deletedAt: true,
        },
      }),
    );
  });
});
