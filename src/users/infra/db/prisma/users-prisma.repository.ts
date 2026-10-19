import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
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
import { splitName } from '../../../../shared/helpers/staff';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  IUserRepository,
  StaffRole,
  UserCreateCommand,
  UserRemovalResult,
  UserStatusCommand,
  UserUpdateCommand,
} from '../../../domain/user.repository';
import { UserModelMapper, USER_INCLUDE } from './user-model.mapper';

const ROLE_NAMES: Record<StaffRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  secretary: 'Secretary',
};

@Injectable()
export class UsersPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: ListQuery = {}) {
    validateListFilters(query, {
      status: ['active', 'inactive'],
      role: [
        'admin',
        'doctor',
        'nurse',
        'secretary',
        'receptionist',
        'patient',
      ],
    });
    const where: Prisma.UserWhereInput = {
      branchId: user.branchId,
      deletedAt: null,
      ...(query.role && { Role: { slug: query.role } }),
      ...(query.status && { isActive: query.status === 'active' }),
      createdAt: dateRange(query),
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { Person: { some: personSearch(query.search) } },
        ],
      }),
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageWindow(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      users.map((item) => UserModelMapper.toEntity(item)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string) {
    return UserModelMapper.toEntity(await this.findScoped(user, id));
  }

  async getPermissions(user: AuthUser, id: string) {
    const [target, permissions] = await Promise.all([
      this.findPermissionTarget(user, id),
      this.prisma.permission.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      }),
    ]);
    const rolePermissions = new Set(
      target.Role?.RolePermission.map(
        (assignment) => assignment.permission.slug,
      ) ?? [],
    );
    const userOverrides = new Map(
      target.UserPermission.map((override) => [
        override.permission.slug,
        override.granted,
      ]),
    );
    const isAdmin =
      target.Role?.slug === 'admin' || target.Role?.slug === 'administrator';

    return permissions.map((permission) => {
      const roleDefault = isAdmin || rolePermissions.has(permission.slug);
      const overridden = userOverrides.has(permission.slug);
      return {
        slug: permission.slug,
        name: permission.name,
        description: permission.description ?? '',
        roleDefault,
        overridden,
        granted: isAdmin
          ? true
          : (userOverrides.get(permission.slug) ?? roleDefault),
      };
    });
  }

  async setPermissions(
    user: AuthUser,
    id: string,
    input: { permissions: string[] },
  ) {
    const [target, permissions] = await Promise.all([
      this.findPermissionTarget(user, id),
      this.prisma.permission.findMany({
        where: { deletedAt: null },
        select: { id: true, slug: true },
      }),
    ]);
    const targetIsAdmin =
      target.Role?.slug === 'admin' || target.Role?.slug === 'administrator';
    if (targetIsAdmin) {
      throw new ForbiddenException(
        'Administrator permissions cannot be modified',
      );
    }

    const requested = new Set(input.permissions);
    const knownPermissions = new Set(permissions.map(({ slug }) => slug));
    const unknown = [...requested].filter(
      (slug) => !knownPermissions.has(slug),
    );
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown permissions: ${unknown.join(', ')}`,
      );
    }

    const rolePermissions = new Set(
      target.Role?.RolePermission.map(
        (assignment) => assignment.permission.slug,
      ) ?? [],
    );
    const overrides = permissions.flatMap((permission) => {
      const granted = requested.has(permission.slug);
      return granted === rolePermissions.has(permission.slug)
        ? []
        : [{ userId: id, permissionId: permission.id, granted }];
    });

    await this.prisma.$transaction(async (transaction) => {
      await transaction.userPermission.deleteMany({ where: { userId: id } });
      if (overrides.length > 0) {
        await transaction.userPermission.createMany({ data: overrides });
      }
    });
    return this.getPermissions(user, id);
  }

  async create(user: AuthUser, input: UserCreateCommand) {
    const email = input.email.trim().toLowerCase();
    const duplicate = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('An account with this email already exists');
    }

    const name = splitName(input.name);

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const role = await this.upsertRole(transaction, input.role);
        const address = await transaction.address.create({
          data: {
            street: 'Not specified',
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
        // Doctors need a profile so they show up in the doctors and scheduling screens.
        if (input.role === 'doctor') {
          await transaction.doctorProfile.create({
            data: { userId: createdUser.id },
          });
        }
        return transaction.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: USER_INCLUDE,
        });
      });
      return UserModelMapper.toEntity(created);
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

  async update(user: AuthUser, id: string, input: UserUpdateCommand) {
    const current = await this.findScoped(user, id);
    const currentRole = current.Role?.slug;
    const changesRole = input.role !== undefined && input.role !== currentRole;

    if (changesRole && id === user.id) {
      throw new ForbiddenException('You cannot change your own role');
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      if (changesRole && currentRole === 'admin') {
        await this.ensureAnotherAdmin(transaction, user.branchId, id);
      }

      const role = changesRole
        ? await this.upsertRole(transaction, input.role as StaffRole)
        : undefined;
      if (role) {
        await transaction.user.update({
          where: { id },
          data: { roleId: role.id },
        });
        await transaction.userRole.deleteMany({ where: { userId: id } });
        await transaction.userRole.create({
          data: { userId: id, roleId: role.id },
        });
        if (input.role === 'doctor') {
          await transaction.doctorProfile.upsert({
            where: { userId: id },
            create: { userId: id },
            update: {},
          });
        }
      }

      const person = current.Person[0];
      if (person) {
        await transaction.person.update({
          where: { id: person.id },
          data: {
            ...(input.name !== undefined && splitName(input.name)),
            ...(input.phone !== undefined && {
              phoneNumber: input.phone.trim(),
            }),
            ...(role && { roleId: role.id }),
          },
        });
      }

      return transaction.user.findUniqueOrThrow({
        where: { id },
        include: USER_INCLUDE,
      });
    });
    return UserModelMapper.toEntity(updated);
  }

  async setStatus(user: AuthUser, id: string, input: UserStatusCommand) {
    const current = await this.findScoped(user, id);

    const updated = await this.prisma.$transaction(async (transaction) => {
      if (!input.active && current.Role?.slug === 'admin') {
        await this.ensureAnotherAdmin(transaction, user.branchId, id);
      }
      return transaction.user.update({
        where: { id },
        data: { isActive: input.active },
        include: USER_INCLUDE,
      });
    });
    return UserModelMapper.toEntity(updated);
  }

  async remove(user: AuthUser, id: string): Promise<UserRemovalResult> {
    const current = await this.findScoped(user, id);

    await this.prisma.$transaction(async (transaction) => {
      if (current.Role?.slug === 'admin') {
        await this.ensureAnotherAdmin(transaction, user.branchId, id);
      }
      const deletedAt = new Date();
      await transaction.user.update({
        where: { id },
        data: { isActive: false, deletedAt },
      });
      await transaction.person.updateMany({
        where: { userId: id, deletedAt: null },
        data: { deletedAt },
      });
    });
    return { id, deleted: true };
  }

  private async findScoped(user: AuthUser, id: string) {
    const found = await this.prisma.user.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      include: USER_INCLUDE,
    });
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  private async findPermissionTarget(user: AuthUser, id: string) {
    const target = await this.prisma.user.findFirst({
      where: { id, branchId: user.branchId, deletedAt: null },
      select: {
        Role: {
          select: {
            slug: true,
            RolePermission: {
              where: { deletedAt: null },
              select: { permission: { select: { slug: true } } },
            },
          },
        },
        UserPermission: {
          where: { deletedAt: null },
          select: {
            granted: true,
            permission: { select: { slug: true } },
          },
        },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    return target;
  }

  private upsertRole(transaction: Prisma.TransactionClient, role: StaffRole) {
    return transaction.role.upsert({
      where: { slug: role },
      create: { name: ROLE_NAMES[role], slug: role, isSystem: true },
      update: {},
    });
  }

  private async ensureAnotherAdmin(
    transaction: Prisma.TransactionClient,
    branchId: string,
    excludedId: string,
  ) {
    const others = await transaction.user.count({
      where: {
        branchId,
        id: { not: excludedId },
        isActive: true,
        deletedAt: null,
        Role: { slug: 'admin' },
      },
    });
    if (others === 0) {
      throw new ConflictException(
        'The clinic must keep at least one active administrator',
      );
    }
  }
}
