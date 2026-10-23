import {
  Prisma,
  AppointmentStatus as PrismaAppointmentStatus,
} from '../../../../../generated/prisma/client';
import {
  PaginatedResult,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  personSearch,
} from '../../../../shared/helpers/list-filters';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  Appointment,
  AppointmentConflictError,
  AppointmentId,
  AppointmentListCriteria,
  AppointmentScope,
  AppointmentView,
  BookedSlot,
  BUSY_APPOINTMENT_STATUSES,
  FindBookedSlotsQuery,
  IAppointmentRepository,
} from '../../../domain';
import {
  APPOINTMENT_VIEW_INCLUDE,
  AppointmentModelMapper,
} from './appointment-model.mapper';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export class AppointmentsPrismaRepository implements IAppointmentRepository {
  constructor(
    private readonly _prismaService: PrismaService,
    private readonly _client: Prisma.TransactionClient = _prismaService,
  ) {}

  async insert(appointment: Appointment): Promise<void> {
    try {
      await this._client.appointment.create({
        data: AppointmentModelMapper.toCreateModel(appointment),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new AppointmentConflictError(
          'Doctor is already booked for this time slot',
        );
      }
      throw error;
    }
  }

  async update(appointment: Appointment): Promise<void> {
    await this._client.appointment.update({
      where: { id: appointment.id.value },
      data: AppointmentModelMapper.toUpdateModel(appointment),
    });
  }

  async findById(
    id: AppointmentId,
    scope: AppointmentScope,
  ): Promise<Appointment | null> {
    const model = await this._client.appointment.findFirst({
      where: this.scopedWhere(id, scope),
    });
    return model ? AppointmentModelMapper.toEntity(model) : null;
  }

  async findViewById(
    id: AppointmentId,
    scope: AppointmentScope,
  ): Promise<AppointmentView | null> {
    const model = await this._client.appointment.findFirst({
      where: this.scopedWhere(id, scope),
      include: APPOINTMENT_VIEW_INCLUDE,
    });
    return model ? AppointmentModelMapper.toView(model) : null;
  }

  async listPaginated(
    criteria: AppointmentListCriteria,
  ): Promise<PaginatedResult<AppointmentView>> {
    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      doctor: { branchId: criteria.branchId },
      date: dateRange(criteria),
      ...(criteria.status && {
        status: criteria.status as PrismaAppointmentStatus,
      }),
      AND: [
        ...(criteria.doctorId ? [{ doctorId: criteria.doctorId }] : []),
        ...(criteria.patientId ? [{ patientId: criteria.patientId }] : []),
      ],
      ...(criteria.restrictToPatientId && {
        patientId: criteria.restrictToPatientId,
      }),
      ...(criteria.restrictToDoctorId && {
        doctorId: criteria.restrictToDoctorId,
      }),
      ...(criteria.search && {
        OR: [
          { reason: { contains: criteria.search, mode: 'insensitive' } },
          { patient: personSearch(criteria.search) },
          { doctor: { Person: { some: personSearch(criteria.search) } } },
        ],
      }),
    };
    const [models, total] = await this._prismaService.$transaction([
      this._prismaService.appointment.findMany({
        where,
        include: APPOINTMENT_VIEW_INCLUDE,
        orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
        ...pageWindow(criteria),
      }),
      this._prismaService.appointment.count({ where }),
    ]);
    return paginated(
      models.map((model) => AppointmentModelMapper.toView(model)),
      total,
      criteria,
    );
  }

  async findBookedSlots(query: FindBookedSlotsQuery): Promise<BookedSlot[]> {
    return this._client.appointment.findMany({
      where: {
        doctorId: { in: query.doctorIds },
        date: query.date,
        deletedAt: null,
        status: {
          in: [...BUSY_APPOINTMENT_STATUSES] as PrismaAppointmentStatus[],
        },
        ...(query.excludedAppointmentId && {
          id: { not: query.excludedAppointmentId },
        }),
      },
      select: { doctorId: true, time: true },
      orderBy: { time: 'asc' },
    });
  }

  async runWithDoctorLock<T>(
    doctorId: string,
    action: (repository: IAppointmentRepository) => Promise<T>,
  ): Promise<T> {
    return this._prismaService.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "users" WHERE "id" = ${doctorId} FOR UPDATE
      `;
      return action(
        new AppointmentsPrismaRepository(this._prismaService, transaction),
      );
    });
  }

  private scopedWhere(
    id: AppointmentId,
    scope: AppointmentScope,
  ): Prisma.AppointmentWhereInput {
    return {
      id: id.value,
      deletedAt: null,
      ...(scope.patientUserId
        ? {
            patient: {
              branchId: scope.branchId,
              userId: scope.patientUserId,
            },
          }
        : { doctor: { branchId: scope.branchId } }),
    };
  }
}
