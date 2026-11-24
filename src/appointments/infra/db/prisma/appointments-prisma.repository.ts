import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { personSearch } from '../../../../shared/helpers/list-filters';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AppointmentClinicRecord,
  AppointmentDoctorRecord,
  AppointmentListCriteria,
  AppointmentPersonRecord,
  AppointmentRecord,
  AppointmentSlotConflictError,
  AppointmentSlotRecord,
  CreateAppointmentData,
  IAppointmentRepository,
  UpdateAppointmentData,
} from '../../../domain/appointment.repository';

const APPOINTMENT_INCLUDE = {
  patient: {
    select: {
      id: true,
      userId: true,
      branchId: true,
      deletedAt: true,
      firstName: true,
      lastName: true,
      Role: { select: { slug: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      email: true,
      branchId: true,
      deletedAt: true,
      isActive: true,
      createdAt: true,
      Role: { select: { slug: true } },
      Person: {
        where: { deletedAt: null },
        take: 1,
        select: { firstName: true, lastName: true },
      },
      doctorProfile: {
        select: { specialties: true, workingDays: true, workingHours: true },
      },
    },
  },
} satisfies Prisma.AppointmentInclude;

const DOCTOR_SELECT = {
  id: true,
  email: true,
  branchId: true,
  deletedAt: true,
  isActive: true,
  createdAt: true,
  Role: { select: { slug: true } },
  Person: {
    where: { deletedAt: null },
    take: 1,
    select: { firstName: true, lastName: true },
  },
  doctorProfile: {
    select: { specialties: true, workingDays: true, workingHours: true },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AppointmentsPrismaRepository implements IAppointmentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly client: Prisma.TransactionClient | PrismaService = prisma,
  ) {}

  transaction<T>(
    operation: (repository: IAppointmentRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((transaction) =>
      operation(new AppointmentsPrismaRepository(this.prisma, transaction)),
    );
  }

  findBranchSchedule(
    branchId: string,
  ): Promise<AppointmentClinicRecord | null> {
    return this.client.branch.findUnique({
      where: { id: branchId },
      select: {
        deletedAt: true,
        workingDays: true,
        workingHours: true,
        timezone: true,
      },
    });
  }

  findPatientById(id: string): Promise<AppointmentPersonRecord | null> {
    return this.client.person.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        branchId: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        Role: { select: { slug: true } },
      },
    });
  }

  findPatientByUserId(
    userId: string,
    branchId: string,
  ): Promise<AppointmentPersonRecord | null> {
    return this.client.person.findFirst({
      where: { userId, branchId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        branchId: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        Role: { select: { slug: true } },
      },
    });
  }

  findDoctorById(id: string): Promise<AppointmentDoctorRecord | null> {
    return this.client.user.findUnique({
      where: { id },
      select: DOCTOR_SELECT,
    });
  }

  findDoctorsByBranch(branchId: string): Promise<AppointmentDoctorRecord[]> {
    return this.client.user.findMany({
      where: { branchId },
      select: DOCTOR_SELECT,
    });
  }

  findAppointmentById(id: string): Promise<AppointmentRecord | null> {
    return this.client.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async findAppointments(
    criteria: AppointmentListCriteria,
  ): Promise<{ appointments: AppointmentRecord[]; total: number }> {
    const date: Prisma.DateTimeFilter = {
      ...(criteria.dateFrom && { gte: criteria.dateFrom }),
      ...(criteria.dateToExclusive && { lt: criteria.dateToExclusive }),
    };
    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      doctor: { branchId: criteria.branchId },
      ...(Object.keys(date).length > 0 && { date }),
      ...(criteria.status && { status: criteria.status }),
      AND: [
        ...(criteria.doctorId ? [{ doctorId: criteria.doctorId }] : []),
        ...(criteria.patientId ? [{ patientId: criteria.patientId }] : []),
        ...(criteria.doctorScopeId
          ? [{ doctorId: criteria.doctorScopeId }]
          : []),
        ...(criteria.patientScopeId
          ? [{ patientId: criteria.patientScopeId }]
          : []),
      ],
      ...(criteria.search && {
        OR: [
          {
            reason: {
              contains: criteria.search,
              mode: 'insensitive',
            },
          },
          { patient: personSearch(criteria.search) },
          { doctor: { Person: { some: personSearch(criteria.search) } } },
        ],
      }),
    };
    const [appointments, total] = await Promise.all([
      this.client.appointment.findMany({
        where,
        include: APPOINTMENT_INCLUDE,
        orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
        skip: criteria.skip,
        take: criteria.take,
      }),
      this.client.appointment.count({ where }),
    ]);

    return { appointments, total };
  }

  findAppointmentsForDoctorsOnDate(
    doctorIds: string[],
    date: Date,
  ): Promise<AppointmentSlotRecord[]> {
    return this.client.appointment.findMany({
      where: { doctorId: { in: doctorIds }, date },
      select: {
        id: true,
        doctorId: true,
        time: true,
        status: true,
        deletedAt: true,
      },
    });
  }

  findAppointmentsForDoctorOnDate(
    doctorId: string,
    date: Date,
  ): Promise<AppointmentSlotRecord[]> {
    return this.client.appointment.findMany({
      where: { doctorId, date },
      select: {
        id: true,
        doctorId: true,
        time: true,
        status: true,
        deletedAt: true,
      },
    });
  }

  async lockDoctorForAppointment(doctorId: string): Promise<void> {
    await this.client.$queryRaw`
      SELECT "id" FROM "users" WHERE "id" = ${doctorId} FOR UPDATE
    `;
  }

  async createAppointment(
    data: CreateAppointmentData,
  ): Promise<AppointmentRecord> {
    try {
      return await this.client.appointment.create({
        data,
        include: APPOINTMENT_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppointmentSlotConflictError();
      }
      throw error;
    }
  }

  updateAppointment(
    id: string,
    data: UpdateAppointmentData,
  ): Promise<AppointmentRecord> {
    return this.client.appointment.update({
      where: { id },
      data,
      include: APPOINTMENT_INCLUDE,
    });
  }
}
