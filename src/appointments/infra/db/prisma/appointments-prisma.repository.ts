import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { AuthUser } from '../../../../auth/auth-user';
import { hasPermission } from '../../../../auth/permissions';
import { AppointmentStatus } from '../../../../../generated/prisma/client';
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
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AppointmentAvailabilityQuery,
  CreateAppointmentCommand,
  IAppointmentRepository,
  RescheduleAppointmentCommand,
  UpdateAppointmentCommand,
} from '../../../domain/appointment.repository';
import {
  APPOINTMENT_SLOT_DURATION_MS,
  buildFreeSlots,
  doctorScheduleOrClinic,
  hasAppointmentConflict,
  isDoctorWorkingSlot,
  rankDoctorsByLoad,
} from '../../../appointment-time';
import {
  clinicNow,
  resolveClinicSchedule,
  weekdayOf,
  WeeklySchedule,
} from '../../../../shared/helpers/schedule';

const STAFF_ROLES = new Set([
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
]);
const BUSY_STATUSES = ['PENDING', 'CONFIRMED'] as const;

@Injectable()
export class AppointmentsPrismaRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, {
      status: ['pending', 'confirmed', 'cancelled', 'completed'],
      doctorId: true,
      patientId: true,
    });
    const canReadAll =
      hasPermission(user, 'appointments.read.all') ||
      hasPermission(user, 'appointments.manage');
    const canReadAssigned = hasPermission(
      user,
      'appointments.read.assigned',
    );
    const patient =
      user.role === 'patient'
        ? await this.prisma.person.findFirst({
          where: { userId: user.id, branchId: user.branchId, deletedAt: null },
          select: { id: true },
        })
        : null;
    if (user.role !== 'patient' && !canReadAll && !canReadAssigned) {
      throw new ForbiddenException('Appointment read access is required');
    }
    const status = Object.values(AppointmentStatus).find(
      (value) => value.toLowerCase() === query.status,
    );
    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      doctor: { branchId: user.branchId },
      date: dateRange(query),
      ...(status && { status }),
      AND: [
        ...(query.doctorId ? [{ doctorId: query.doctorId }] : []),
        ...(query.patientId ? [{ patientId: query.patientId }] : []),
      ],
      ...(user.role === 'patient'
        ? { patientId: patient?.id ?? '__no-patient-profile__' }
        : canReadAll
          ? { doctor: { branchId: user.branchId } }
          : { doctorId: user.id }),
      ...(query.search && {
        OR: [
          { reason: { contains: query.search, mode: 'insensitive' } },
          { patient: personSearch(query.search) },
          { doctor: { Person: { some: personSearch(query.search) } } },
        ],
      }),
    };
    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          doctor: {
            include: {
              Person: { where: { deletedAt: null }, take: 1 },
              doctorProfile: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return paginated(
      appointments.map((appointment) => this.toAppointment(appointment)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    const appointment = await this.findScopedAppointment(user, id);
    this.requireAppointmentAccess(user, appointment);
    return this.toAppointment(appointment);
  }

  async create(user: AuthUser, input: CreateAppointmentCommand) {
    if (!STAFF_ROLES.has(user.role) && user.role !== 'patient') {
      throw new ForbiddenException(
        'Clinic staff or patient access is required',
      );
    }
    const { date, time } = this.toDateTime(input.date, input.time);
    const clinic = await this.loadClinic(user.branchId);
    this.assertNotPast(time, clinic.timezone);
    this.assertClinicOpen(date, input.time, clinic.schedule);

    const patient = await this.prisma.person.findFirst({
      where: {
        ...(user.role === 'patient'
          ? { userId: user.id }
          : { id: input.patientId }),
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
    if (!patient)
      throw new NotFoundException('Patient not found in this clinic');

    const booking = {
      user,
      patientId: patient.id,
      date,
      time,
      reason: input.reason.trim(),
      description: input.description?.trim(),
    };

    if (!input.doctorId) {
      return this.toAppointment(
        await this.bookWithAnyDoctor(booking, input.time, clinic),
      );
    }

    const doctor = await this.prisma.user.findFirst({
      where: {
        id: input.doctorId,
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'doctor' },
      },
      include: { doctorProfile: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found in this clinic');
    this.assertDoctorHasAvailability(
      doctor.doctorProfile,
      clinic.schedule,
      date,
      input.time,
    );

    const appointment = await this.createWithoutConflict({
      ...booking,
      doctorId: doctor.id,
    });
    return this.toAppointment(appointment);
  }

  async cancel(user: AuthUser, id: string) {
    const appointment = await this.findScopedAppointment(user, id);
    this.requireAppointmentAccess(user, appointment);
    if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be cancelled',
      );
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        patient: true,
        doctor: {
          include: {
            Person: { where: { deletedAt: null }, take: 1 },
            doctorProfile: true,
          },
        },
      },
    });
    return this.toAppointment(updated);
  }

  async complete(user: AuthUser, id: string) {
    if (user.role !== 'admin' && user.role !== 'doctor') {
      throw new ForbiddenException(
        'Only administrators and doctors can complete appointments',
      );
    }
    const appointment = await this.findScopedAppointment(user, id);
    this.requireAppointmentAccess(user, appointment);
    if (appointment.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Only confirmed appointments can be completed',
      );
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        patient: true,
        doctor: {
          include: {
            Person: { where: { deletedAt: null }, take: 1 },
            doctorProfile: true,
          },
        },
      },
    });
    return this.toAppointment(updated);
  }

  async reschedule(
    user: AuthUser,
    id: string,
    input: RescheduleAppointmentCommand,
  ) {
    const current = await this.findScopedAppointment(user, id);
    this.requireAppointmentAccess(user, current);
    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be rescheduled',
      );
    }
    const { date, time } = this.toDateTime(input.date, input.time);
    const clinic = await this.loadClinic(user.branchId);
    this.assertNotPast(time, clinic.timezone);
    this.assertClinicOpen(date, input.time, clinic.schedule);
    this.assertDoctorHasAvailability(
      current.doctor.doctorProfile,
      clinic.schedule,
      date,
      input.time,
    );

    const updated = await this.runWithSlotLock(
      current.doctorId,
      async (transaction) => {
        await this.ensureSlotAvailable(
          transaction,
          current.doctorId,
          date,
          time,
          id,
        );
        return transaction.appointment.update({
          where: { id },
          data: { date, time, status: 'CONFIRMED' },
          include: {
            patient: true,
            doctor: {
              include: {
                Person: { where: { deletedAt: null }, take: 1 },
                doctorProfile: true,
              },
            },
          },
        });
      },
    );
    return this.toAppointment(updated);
  }

  async update(user: AuthUser, id: string, input: UpdateAppointmentCommand) {
    const current = await this.findScopedAppointment(user, id);
    this.requireAppointmentAccess(user, current);
    if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be edited',
      );
    }
    if (user.role === 'patient' && input.patientId !== current.patientId) {
      throw new ForbiddenException(
        'Patients cannot change the appointment patient',
      );
    }
    if (user.role === 'doctor' && input.doctorId !== current.doctorId) {
      throw new ForbiddenException('Doctors cannot reassign appointments');
    }

    const patient = await this.prisma.person.findFirst({
      where: {
        id: user.role === 'patient' ? current.patientId : input.patientId,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'patient' },
      },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found in this clinic');
    }

    const doctor = await this.prisma.user.findFirst({
      where: {
        id: input.doctorId,
        branchId: user.branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'doctor' },
      },
      include: { doctorProfile: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found in this clinic');

    const { date, time } = this.toDateTime(input.date, input.time);
    const sameSlot =
      doctor.id === current.doctorId &&
      date.getTime() === current.date.getTime() &&
      time.getTime() === current.time.getTime();
    const clinic = await this.loadClinic(user.branchId);
    if (!sameSlot) {
      this.assertNotPast(time, clinic.timezone);
      this.assertClinicOpen(date, input.time, clinic.schedule);
      this.assertDoctorHasAvailability(
        doctor.doctorProfile,
        clinic.schedule,
        date,
        input.time,
      );
    }

    const updated = await this.runWithSlotLock(
      doctor.id,
      async (transaction) => {
        if (!sameSlot) {
          await this.ensureSlotAvailable(
            transaction,
            doctor.id,
            date,
            time,
            id,
          );
        }
        return transaction.appointment.update({
          where: { id },
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            date,
            time,
            reason: input.reason.trim(),
            description: input.description?.trim() || null,
          },
          include: {
            patient: true,
            doctor: {
              include: {
                Person: { where: { deletedAt: null }, take: 1 },
                doctorProfile: true,
              },
            },
          },
        });
      },
    );
    return this.toAppointment(updated);
  }

  async availability(user: AuthUser, query: AppointmentAvailabilityQuery) {
    if (!STAFF_ROLES.has(user.role) && user.role !== 'patient') {
      throw new ForbiddenException(
        'Clinic staff or patient access is required',
      );
    }
    const clinic = await this.loadClinic(user.branchId);
    const doctors = await this.findActiveDoctors(user.branchId, query.doctorId);
    if (query.doctorId && doctors.length === 0) {
      throw new NotFoundException('Doctor not found in this clinic');
    }

    const date = this.utcDate(query.date);
    let excludedAppointmentId: string | undefined;
    if (query.excludeAppointmentId) {
      const excluded = await this.findScopedAppointment(
        user,
        query.excludeAppointmentId,
      );
      this.requireAppointmentAccess(user, excluded);
      if (
        excluded.doctorId === query.doctorId &&
        excluded.date.getTime() === date.getTime() &&
        ['PENDING', 'CONFIRMED'].includes(excluded.status)
      ) {
        excludedAppointmentId = excluded.id;
      }
    }
    const booked = await this.findBookedSlots(
      doctors.map(({ id }) => id),
      date,
      excludedAppointmentId,
    );
    const now = clinicNow(clinic.timezone);
    const slots = buildFreeSlots({
      date,
      clinic: clinic.schedule,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        schedule: doctorScheduleOrClinic(doctor.doctorProfile, clinic.schedule),
      })),
      booked,
      now,
    });
    const today = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );

    return {
      date: query.date,
      doctorId: query.doctorId ?? null,
      closed:
        date.getTime() < today ||
        !clinic.schedule.workingDays.includes(weekdayOf(date)),
      slotDurationMinutes: APPOINTMENT_SLOT_DURATION_MS / 60_000,
      slots,
    };
  }

  private async loadClinic(branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
      select: { workingDays: true, workingHours: true, timezone: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return {
      schedule: resolveClinicSchedule(branch),
      timezone: branch.timezone,
    };
  }

  private findActiveDoctors(branchId: string, doctorId?: string) {
    return this.prisma.user.findMany({
      where: {
        branchId,
        deletedAt: null,
        isActive: true,
        Role: { slug: 'doctor' },
        ...(doctorId && { id: doctorId }),
      },
      include: { doctorProfile: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private findBookedSlots(
    doctorIds: string[],
    date: Date,
    excludedAppointmentId?: string,
  ) {
    return this.prisma.appointment.findMany({
      where: {
        doctorId: { in: doctorIds },
        date,
        deletedAt: null,
        status: { in: [...BUSY_STATUSES] },
        ...(excludedAppointmentId && { id: { not: excludedAppointmentId } }),
      },
      select: { doctorId: true, time: true },
      orderBy: { time: 'asc' },
    });
  }

  // Picks the least busy doctor who is free at the requested time.
  private async bookWithAnyDoctor(
    booking: {
      user: AuthUser;
      patientId: string;
      date: Date;
      time: Date;
      reason: string;
      description?: string;
    },
    timeValue: string,
    clinic: { schedule: WeeklySchedule; timezone: string },
  ) {
    const doctors = await this.findActiveDoctors(booking.user.branchId);
    const booked = await this.findBookedSlots(
      doctors.map(({ id }) => id),
      booking.date,
    );
    const slot = buildFreeSlots({
      date: booking.date,
      clinic: clinic.schedule,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        schedule: doctorScheduleOrClinic(doctor.doctorProfile, clinic.schedule),
      })),
      booked,
      now: clinicNow(clinic.timezone),
    }).find((item) => item.time === timeValue);

    // Another request may take the slot between the lookup and the insert, so fall through the ranking.
    for (const doctorId of rankDoctorsByLoad(slot?.doctorIds ?? [], booked)) {
      try {
        return await this.createWithoutConflict({ ...booking, doctorId });
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
      }
    }
    throw new ConflictException('No doctor is available for this time slot');
  }

  private async createWithoutConflict(input: {
    user: AuthUser;
    patientId: string;
    doctorId: string;
    date: Date;
    time: Date;
    reason: string;
    description?: string;
  }) {
    try {
      return await this.runWithSlotLock(input.doctorId, async (transaction) => {
        await this.ensureSlotAvailable(
          transaction,
          input.doctorId,
          input.date,
          input.time,
        );
        return transaction.appointment.create({
          data: {
            date: input.date,
            time: input.time,
            reason: input.reason,
            description: input.description,
            status: 'CONFIRMED',
            patientId: input.patientId,
            doctorId: input.doctorId,
            userId: input.user.id,
          },
          include: {
            patient: true,
            doctor: {
              include: {
                Person: { where: { deletedAt: null }, take: 1 },
                doctorProfile: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Doctor is already booked for this time slot',
        );
      }
      throw error;
    }
  }

  private async runWithSlotLock<T>(
    doctorId: string,
    action: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "users" WHERE "id" = ${doctorId} FOR UPDATE
      `;
      return action(transaction);
    });
  }

  private async ensureSlotAvailable(
    transaction: Prisma.TransactionClient,
    doctorId: string,
    date: Date,
    time: Date,
    excludedAppointmentId?: string,
  ) {
    const booked = await transaction.appointment.findMany({
      where: {
        doctorId,
        date,
        deletedAt: null,
        status: { in: [...BUSY_STATUSES] },
        ...(excludedAppointmentId && { id: { not: excludedAppointmentId } }),
      },
      select: { time: true },
    });
    if (
      hasAppointmentConflict(
        time,
        booked.map(({ time: bookedTime }) => bookedTime),
      )
    ) {
      throw new ConflictException(
        'Doctor is already booked for this time slot',
      );
    }
  }

  private assertNotPast(time: Date, timezone: string) {
    if (time <= clinicNow(timezone)) {
      throw new BadRequestException('Appointment must be in the future');
    }
  }

  private assertClinicOpen(date: Date, time: string, clinic: WeeklySchedule) {
    if (
      !isDoctorWorkingSlot(date, time, clinic.workingDays, clinic.workingHours)
    ) {
      throw new ConflictException('The clinic is closed at this time');
    }
  }

  private assertDoctorHasAvailability(
    profile: {
      workingDays: string[];
      workingHours: Prisma.JsonValue;
    } | null,
    clinic: WeeklySchedule,
    date: Date,
    time: string,
  ) {
    const schedule = doctorScheduleOrClinic(profile, clinic);
    if (
      !isDoctorWorkingSlot(
        date,
        time,
        schedule.workingDays,
        schedule.workingHours,
      )
    ) {
      throw new ConflictException('Doctor is not available for this time slot');
    }
  }

  private async findScopedAppointment(user: AuthUser, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(STAFF_ROLES.has(user.role)
          ? { doctor: { branchId: user.branchId } }
          : {
              patient: {
                branchId: user.branchId,
                userId: user.id,
              },
            }),
      },
      include: {
        patient: true,
        doctor: {
          include: {
            Person: { where: { deletedAt: null }, take: 1 },
            doctorProfile: true,
          },
        },
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  private requireAppointmentAccess(
    user: AuthUser,
    appointment: { doctorId: string; patient: { userId: string | null } },
  ) {
    if (user.role === 'patient') {
      if (appointment.patient.userId !== user.id) {
        throw new ForbiddenException('You cannot access this appointment');
      }
      return;
    }
    if (
      hasPermission(user, 'appointments.read.all') ||
      hasPermission(user, 'appointments.manage')
    ) {
      return;
    }
    if (
      hasPermission(user, 'appointments.read.assigned') &&
      appointment.doctorId === user.id
    ) {
      return;
    }
    throw new ForbiddenException('You cannot access this appointment');
  }

  private requireStaff(user: AuthUser) {
    if (!STAFF_ROLES.has(user.role)) {
      throw new ForbiddenException('Clinic staff access is required');
    }
  }

  private toDateTime(dateValue: string, timeValue: string) {
    const date = this.utcDate(dateValue);
    const time = new Date(`${dateValue}T${timeValue}:00.000Z`);
    if (Number.isNaN(time.getTime()))
      throw new BadRequestException('Invalid appointment date or time');
    return { date, time };
  }

  private utcDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Invalid date');
    return date;
  }

  private toAppointment(appointment: {
    id: string;
    date: Date;
    time: Date;
    reason: string;
    description: string | null;
    status: string;
    patient: { id: string; firstName: string; lastName: string };
    doctor: {
      id: string;
      email: string;
      Person: { firstName: string; lastName: string }[];
      doctorProfile: { avatar: string | null; specialties: string[] } | null;
    };
  }) {
    const doctorName = appointment.doctor.Person[0]
      ? `${appointment.doctor.Person[0].firstName} ${appointment.doctor.Person[0].lastName}`.trim()
      : appointment.doctor.email;
    return {
      id: appointment.id,
      date: appointment.date.toISOString().slice(0, 10),
      time: appointment.time.toISOString().slice(11, 16),
      patientId: appointment.patient.id,
      patientName:
        `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim(),
      doctorId: appointment.doctor.id,
      doctorName,
      specialty: appointment.doctor.doctorProfile?.specialties[0] ?? '',
      reason: appointment.reason,
      description: appointment.description ?? '',
      status: appointment.status.toLowerCase(),
    };
  }
}
