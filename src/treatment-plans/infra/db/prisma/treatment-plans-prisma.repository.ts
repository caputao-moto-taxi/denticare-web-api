import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  personSearch,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import { joinName, STAFF_ROLES } from '../../../../shared/helpers/staff';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  ITreatmentPlanRepository,
  TreatmentPlanCreateCommand,
  TreatmentPlanProgressCommand,
  TreatmentPlanUpdateCommand,
} from '../../../domain/treatment-plan.repository';

const PLAN_INCLUDE = {
  patient: { select: { firstName: true, lastName: true } },
  doctor: {
    select: {
      email: true,
      Person: {
        where: { deletedAt: null },
        select: { firstName: true, lastName: true },
        take: 1,
      },
      doctorProfile: { select: { avatar: true } },
    },
  },
} as const;

type PlanRow = {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  notes: string | null;
  totalCost: number;
  totalSteps: number;
  completedSteps: number;
  startDate: Date;
  estimatedCompletion: Date | null;
  activePhase: string | null;
  patient: { firstName: string; lastName: string };
  doctor: {
    email: string;
    Person: { firstName: string; lastName: string }[];
  };
};

// Clinical records are written by physicians; nurses only record progress.
const MANAGE_ROLES = new Set(['admin', 'doctor']);
const PROGRESS_ROLES = new Set(['admin', 'doctor', 'nurse']);

@Injectable()
export class TreatmentPlansPrismaRepository implements ITreatmentPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    this.requireRole(user, STAFF_ROLES);
    validateListFilters(query, {
      status: ['planned', 'in-progress', 'completed'],
      doctorId: true,
      patientId: true,
    });
    const where: Prisma.TreatmentPlanWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(query.doctorId && { doctorId: query.doctorId }),
      ...(query.patientId && { patientId: query.patientId }),
      startDate: dateRange(query),
      ...(query.status === 'completed' && {
        completedSteps: { gte: this.prisma.treatmentPlan.fields.totalSteps },
      }),
      ...(query.status === 'in-progress' && {
        completedSteps: {
          gt: 0,
          lt: this.prisma.treatmentPlan.fields.totalSteps,
        },
      }),
      ...(query.status === 'planned' && { completedSteps: 0 }),
      ...(query.search && {
        OR: [
          {
            id: {
              contains: query.search.replace(/^TP-/i, ''),
              mode: 'insensitive',
            },
          },
          { diagnosis: { contains: query.search, mode: 'insensitive' } },
          { patient: personSearch(query.search) },
          { doctor: { Person: { some: personSearch(query.search) } } },
        ],
      }),
    };
    const [plans, total] = await this.prisma.$transaction([
      this.prisma.treatmentPlan.findMany({
        where,
        include: PLAN_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.treatmentPlan.count({ where }),
    ]);
    return paginated(
      plans.map((plan) => this.toPlan(plan)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    this.requireRole(user, STAFF_ROLES);
    return this.toPlan(await this.findScoped(user, id));
  }

  async create(user: AuthUser, input: TreatmentPlanCreateCommand) {
    this.requireRole(user, MANAGE_ROLES);
    await this.assertPatient(user, input.patientId);
    await this.assertDoctor(user, input.doctorId);

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const estimatedCompletion = input.estimatedCompletion
      ? new Date(input.estimatedCompletion)
      : null;
    this.validatePlanDates(startDate, estimatedCompletion);

    const plan = await this.prisma.treatmentPlan.create({
      data: {
        branchId: user.branchId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        diagnosis: input.diagnosis.trim(),
        notes: input.notes?.trim() || null,
        totalCost: input.totalCost,
        totalSteps: input.totalSteps,
        startDate,
        estimatedCompletion,
        activePhase: input.activePhase?.trim() || null,
      },
      include: PLAN_INCLUDE,
    });
    return this.toPlan(plan);
  }

  async update(user: AuthUser, id: string, input: TreatmentPlanUpdateCommand) {
    this.requireRole(user, MANAGE_ROLES);
    const current = await this.findScoped(user, id);
    if (input.doctorId) await this.assertDoctor(user, input.doctorId);

    const totalSteps = input.totalSteps ?? current.totalSteps;
    if (totalSteps < current.completedSteps) {
      throw new BadRequestException(
        'Total steps cannot be lower than the completed steps',
      );
    }
    const startDate = input.startDate
      ? new Date(input.startDate)
      : current.startDate;
    const estimatedCompletion =
      input.estimatedCompletion === undefined
        ? current.estimatedCompletion
        : input.estimatedCompletion
          ? new Date(input.estimatedCompletion)
          : null;
    this.validatePlanDates(startDate, estimatedCompletion);

    const plan = await this.prisma.treatmentPlan.update({
      where: { id: current.id },
      data: {
        ...(input.doctorId !== undefined && { doctorId: input.doctorId }),
        ...(input.diagnosis !== undefined && {
          diagnosis: input.diagnosis.trim(),
        }),
        ...(input.notes !== undefined && { notes: input.notes.trim() || null }),
        ...(input.totalCost !== undefined && { totalCost: input.totalCost }),
        totalSteps,
        ...(input.startDate !== undefined && {
          startDate,
        }),
        ...(input.estimatedCompletion !== undefined && {
          estimatedCompletion,
        }),
        ...(input.activePhase !== undefined && {
          activePhase: input.activePhase.trim() || null,
        }),
      },
      include: PLAN_INCLUDE,
    });
    return this.toPlan(plan);
  }

  async setProgress(
    user: AuthUser,
    id: string,
    input: TreatmentPlanProgressCommand,
  ) {
    this.requireRole(user, PROGRESS_ROLES);

    // The bounds check and the write run together so concurrent updates stay consistent.
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.treatmentPlan.findFirst({
        where: { id, branchId: user.branchId, deletedAt: null },
      });
      if (!current) throw new NotFoundException('Treatment plan not found');
      if (input.completedSteps > current.totalSteps) {
        throw new BadRequestException(
          'Completed steps cannot exceed the total steps',
        );
      }

      const plan = await transaction.treatmentPlan.update({
        where: { id: current.id },
        data: { completedSteps: input.completedSteps },
        include: PLAN_INCLUDE,
      });
      return this.toPlan(plan);
    });
  }

  async remove(user: AuthUser, id: string) {
    this.requireRole(user, new Set(['admin']));
    const current = await this.findScoped(user, id);
    await this.prisma.treatmentPlan.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
    return { id: current.id, deleted: true };
  }

  private async findScoped(user: AuthUser, id: string) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Treatment plan not found');
    return plan;
  }

  private async assertPatient(user: AuthUser, patientId: string) {
    const patient = await this.prisma.person.findFirst({
      where: {
        id: patientId,
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
  }

  private async assertDoctor(user: AuthUser, doctorId: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'doctor' },
      },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
  }

  private requireRole(user: AuthUser, allowed: Set<string>) {
    if (!allowed.has(user.role)) {
      throw new ForbiddenException(
        'You do not have permission for this treatment plan action',
      );
    }
  }

  private validatePlanDates(startDate: Date, estimatedCompletion: Date | null) {
    if (estimatedCompletion && estimatedCompletion < startDate) {
      throw new BadRequestException(
        'Estimated completion cannot be before the plan start date',
      );
    }
  }

  private toPlan(plan: PlanRow) {
    const status =
      plan.completedSteps >= plan.totalSteps
        ? 'completed'
        : plan.completedSteps === 0
          ? 'planned'
          : 'in-progress';

    return {
      id: plan.id,
      code: `TP-${plan.id.slice(0, 8).toUpperCase()}`,
      patientId: plan.patientId,
      patientName: joinName(plan.patient, ''),
      patientAvatar: '',
      doctorId: plan.doctorId,
      doctorName: joinName(plan.doctor.Person[0], plan.doctor.email),
      diagnosis: plan.diagnosis,
      notes: plan.notes ?? '',
      date: plan.startDate.toISOString(),
      estimatedCompletion: plan.estimatedCompletion?.toISOString() ?? '',
      activePhase: plan.activePhase ?? '',
      totalCost: plan.totalCost,
      totalSteps: plan.totalSteps,
      completedSteps: plan.completedSteps,
      status,
    };
  }
}
