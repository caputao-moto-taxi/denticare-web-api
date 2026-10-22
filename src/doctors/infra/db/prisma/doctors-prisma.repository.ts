import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../../../../auth/auth-user';
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
import {
  DoctorCreateCommand,
  DoctorUpdateCommand,
  IDoctorRepository,
} from '../../../domain/doctor.repository';

@Injectable()
export class DoctorsPrismaRepository implements IDoctorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, {
      status: ['active', 'inactive'],
      specialty: true,
      type: ['FULL_TIME', 'PART_TIME'],
    });
    const where: Prisma.UserWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      Role: { slug: 'doctor' },
      ...(query.status && { isActive: query.status === 'active' }),
      createdAt: dateRange(query),
      ...((query.specialty || query.type) && {
        doctorProfile: {
          ...(query.specialty && { specialties: { has: query.specialty } }),
          ...(query.type && { type: query.type }),
        },
      }),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { Person: { some: personSearch(query.search) } },
          { doctorProfile: { specialties: { has: query.search } } },
        ],
      }),
    };
    const [doctors, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: {
          Role: true,
          Address: true,
          Person: { where: { deletedAt: null }, take: 1 },
          doctorProfile: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      doctors.map((doctor) => this.toDoctor(doctor)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'doctor' },
      },
      include: {
        Role: true,
        Address: true,
        Person: { where: { deletedAt: null }, take: 1 },
        doctorProfile: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const completedAppointmentsCount = await this.prisma.appointment.count({
      where: {
        doctorId: id,
        deletedAt: null,
        status: 'COMPLETED',
      },
    });
    return { ...this.toDoctor(doctor), completedAppointmentsCount };
  }

  async create(user: AuthUser, input: DoctorCreateCommand) {
    const email = input.email.trim().toLowerCase();
    const duplicate = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (duplicate)
      throw new ConflictException('An account with this email already exists');

    const name = this.splitName(input.name);
    try {
      const doctor = await this.prisma.$transaction(async (transaction) => {
        const role = await transaction.role.upsert({
          where: { slug: 'doctor' },
          create: { name: 'Doctor', slug: 'doctor', isSystem: true },
          update: {},
        });
        const address = await transaction.address.create({
          data: {
            street: input.address.trim(),
            city: 'Not specified',
            country: 'Angola',
          },
        });
        const createdUser = await transaction.user.create({
          data: {
            email,
            username: email,
            password: input.passwordHash,
            branchId: user.branchId,
            addressId: address.id,
            roleId: role.id,
            isActive: true,
            UserRole: { create: { roleId: role.id } },
          },
        });
        await transaction.person.create({
          data: {
            ...name,
            email,
            phoneNumber: input.phone?.trim(),
            branchId: user.branchId,
            addressId: address.id,
            roleId: role.id,
            userId: createdUser.id,
          },
        });
        await transaction.doctorProfile.create({
          data: {
            userId: createdUser.id,
            avatar: input.avatar,
            type: input.type,
            crmNumber: input.crmNumber,
            specialties: input.specialties ?? [],
            workingDays: input.workingDays ?? [],
            workingHours: input.workingHours as Prisma.InputJsonValue,
            daysOffNotes: input.daysOffNotes,
          },
        });
        return transaction.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: {
            Role: true,
            Address: true,
            Person: { where: { deletedAt: null }, take: 1 },
            doctorProfile: true,
          },
        });
      });

      return this.toDoctor(doctor);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async update(user: AuthUser, id: string, input: DoctorUpdateCommand) {
    const current = await this.prisma.user.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'doctor' },
      },
      include: { doctorProfile: true, Address: true, Person: { take: 1 } },
    });
    if (!current?.doctorProfile)
      throw new NotFoundException('Doctor not found');

    const email = input.email?.trim().toLowerCase();
    if (email && email !== current.email) {
      const duplicate = await this.prisma.user.findFirst({
        where: { email, deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException(
          'An account with this email already exists',
        );
    }
    const name = input.name ? this.splitName(input.name) : undefined;

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: email ? { email, username: email } : {},
      });
      const person = current.Person[0];
      if (person) {
        await transaction.person.update({
          where: { id: person.id },
          data: {
            ...name,
            ...(email && { email }),
            ...(input.phone !== undefined && {
              phoneNumber: input.phone.trim(),
            }),
          },
        });
      }
      if (input.address !== undefined && current.addressId) {
        await transaction.address.update({
          where: { id: current.addressId },
          data: { street: input.address.trim() },
        });
      }
      return transaction.doctorProfile.update({
        where: { userId: id },
        data: {
          ...(input.avatar !== undefined && { avatar: input.avatar }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.crmNumber !== undefined && { crmNumber: input.crmNumber }),
          ...(input.specialties !== undefined && {
            specialties: input.specialties,
          }),
          ...(input.workingDays !== undefined && {
            workingDays: input.workingDays,
          }),
          ...(input.workingHours !== undefined && {
            workingHours: input.workingHours as Prisma.InputJsonValue,
          }),
          ...(input.daysOffNotes !== undefined && {
            daysOffNotes: input.daysOffNotes,
          }),
        },
      });
    });

    return {
      ...this.toDoctor({ ...current, doctorProfile: updated }),
      email: email ?? current.email,
    };
  }

  async remove(user: AuthUser, id: string) {
    const result = await this.prisma.user.updateMany({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'doctor' },
      },
      data: { isActive: false },
    });
    if (!result.count) throw new NotFoundException('Doctor not found');
    return { id, active: false };
  }

  async getAvatarStorageKey(user: AuthUser, id: string) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'doctor' },
      },
      select: { doctorProfile: { select: { avatar: true } } },
    });
    if (!doctor?.doctorProfile) throw new NotFoundException('Doctor not found');
    const key = doctor.doctorProfile.avatar;
    return key?.startsWith(`doctors/${id}/avatar/`) ? key : null;
  }

  async updateAvatarStorageKey(user: AuthUser, id: string, storageKey: string) {
    await this.getAvatarStorageKey(user, id);
    const doctor = await this.prisma.user.findFirst({
      where: {
        id,
        branchId: user.branchId,
        deletedAt: null,
        Role: { slug: 'doctor' },
      },
      select: { doctorProfile: { select: { userId: true } } },
    });
    if (!doctor?.doctorProfile) throw new NotFoundException('Doctor not found');
    await this.prisma.doctorProfile.update({
      where: { userId: id },
      data: { avatar: storageKey },
    });
  }

  private splitName(fullName: string) {
    const [firstName, ...parts] = fullName
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ');
    return { firstName, lastName: parts.join(' ') || firstName };
  }

  private toDoctor(doctor: {
    id: string;
    email: string;
    isActive: boolean;
    Person: {
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    }[];
    Address: { street: string } | null;
    doctorProfile: {
      avatar: string | null;
      type: string;
      crmNumber: string | null;
      specialties: string[];
      workingDays: string[];
      workingHours: Prisma.JsonValue;
      daysOffNotes: string | null;
    } | null;
  }) {
    const person = doctor.Person[0];
    const profile = doctor.doctorProfile;
    return {
      id: doctor.id,
      name: person
        ? `${person.firstName} ${person.lastName}`.trim()
        : doctor.email,
      email: doctor.email,
      phone: person?.phoneNumber ?? '',
      address: doctor.Address?.street ?? '',
      avatar: profile?.avatar?.startsWith(`doctors/${doctor.id}/avatar/`)
        ? `/doctors/${doctor.id}/avatar`
        : (profile?.avatar ?? ''),
      type: profile?.type ?? 'FULL_TIME',
      workingDays: profile?.workingDays ?? [],
      workingHours: profile?.workingHours ?? {},
      specialties: profile?.specialties ?? [],
      crmNumber: profile?.crmNumber ?? '',
      daysOffNotes: profile?.daysOffNotes ?? '',
      active: doctor.isActive,
    };
  }
}
