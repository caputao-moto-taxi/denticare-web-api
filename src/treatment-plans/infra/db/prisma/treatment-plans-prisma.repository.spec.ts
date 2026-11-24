import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { TreatmentPlansPrismaRepository } from './treatment-plans-prisma.repository';

describe('TreatmentPlansPrismaRepository', () => {
  const doctor: AuthUser = {
    id: 'doctor-1',
    email: 'doctor@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const plan = {
    id: 'abcdef12-0000-0000-0000-000000000000',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    diagnosis: 'Cavities',
    notes: null,
    totalCost: 3500,
    totalSteps: 5,
    completedSteps: 2,
    startDate: new Date('2026-01-01T00:00:00Z'),
    patient: { firstName: 'Ana', lastName: 'Costa' },
    doctor: {
      email: 'doctor@example.test',
      Person: [{ firstName: 'Joao', lastName: 'Silva' }],
    },
  };

  const treatmentPlan = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const person = { findFirst: jest.fn() };
  const user = { findFirst: jest.fn() };
  const prisma = {
    treatmentPlan,
    person,
    user,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({ treatmentPlan }),
    ),
  } as unknown as PrismaService;
  const repository = new TreatmentPlansPrismaRepository(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (operation: Promise<unknown>[] | ((tx: unknown) => unknown)) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : operation({ treatmentPlan }),
    );
    treatmentPlan.count.mockResolvedValue(1);
  });

  it('lists only plans of the caller branch with a derived status', async () => {
    treatmentPlan.findMany.mockResolvedValue([plan]);

    const {
      data: [result],
    } = await repository.list(doctor);

    expect(treatmentPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'branch-1', deletedAt: null, startDate: {} },
      }),
    );
    expect(result).toMatchObject({
      patientName: 'Ana Costa',
      doctorName: 'Joao Silva',
      status: 'in-progress',
      code: 'TP-ABCDEF12',
    });
  });

  it('checks patient existence within the caller branch', async () => {
    person.findFirst.mockResolvedValue(null);

    await expect(
      repository.patientExists(doctor, 'foreign-patient'),
    ).resolves.toBe(false);
    expect(person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'foreign-patient',
          branchId: 'branch-1',
        }),
      }),
    );
  });

  it('keeps the progress bound check inside its transaction', async () => {
    treatmentPlan.findFirst.mockResolvedValue(plan);

    await expect(
      repository.setProgress(doctor, plan.id, { completedSteps: 6 }),
    ).resolves.toBeNull();
    expect(treatmentPlan.update).not.toHaveBeenCalled();
  });

  it('does not persist total steps below current progress', async () => {
    treatmentPlan.findFirst.mockResolvedValue(plan);

    await expect(
      repository.update(doctor, plan.id, { totalSteps: 1 }),
    ).resolves.toBeNull();
    expect(treatmentPlan.update).not.toHaveBeenCalled();
  });

  it('marks the plan as completed when every step is done', async () => {
    treatmentPlan.findFirst.mockResolvedValue(plan);
    treatmentPlan.update.mockResolvedValue({ ...plan, completedSteps: 5 });

    await expect(
      repository.setProgress(doctor, plan.id, { completedSteps: 5 }),
    ).resolves.toMatchObject({ status: 'completed', completedSteps: 5 });
  });

  it('returns not found for a plan outside the caller branch', async () => {
    treatmentPlan.findFirst.mockResolvedValue(null);
    await expect(
      repository.findOne(doctor, 'foreign-plan'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
