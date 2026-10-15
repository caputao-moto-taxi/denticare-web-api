import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../../../../generated/prisma/client';
import { randomUUID } from 'crypto';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../../../auth-user';
import { resolvePermissions } from '../../../permissions';
import {
  IAuthRepository,
  LoginCommand,
  RegisterCommand,
  UpdateProfileCommand,
} from '../../../domain/auth.repository';

const USER_PROFILE = {
  id: true,
  email: true,
  branchId: true,
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
  Person: {
    where: { deletedAt: null },
    select: { firstName: true, lastName: true, phoneNumber: true },
    take: 1,
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly hashService: IHashService,
  ) {}

  async register(input: RegisterCommand) {
    const email = input.adminEmail.trim().toLowerCase();
    const clinicEmail = input.clinicEmail.trim().toLowerCase();
    const duplicate = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('An account with this email already exists');
    }

    const plan = await this.prisma.plan.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!plan) {
      throw new ServiceUnavailableException(
        'Clinic registration is unavailable because no subscription plan is configured',
      );
    }

    const normalizedName = input.adminName.trim().replace(/\s+/g, ' ');
    const [firstName, ...lastNameParts] = normalizedName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    const password = await this.hashService.hashPassword(input.password);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const adminRole = await transaction.role.upsert({
          where: { slug: 'admin' },
          create: {
            name: 'Administrator',
            slug: 'admin',
            description: 'Clinic administrator',
            isSystem: true,
          },
          update: {},
        });
        const address = await transaction.address.create({
          data: {
            street: input.address.trim(),
            city: 'Not specified',
            country: 'Angola',
          },
        });
        const headquarter = await transaction.headquarter.create({
          data: {
            name: input.clinicName.trim(),
            address: input.address.trim(),
            email: clinicEmail,
            phone: input.clinicPhone.trim(),
            nif: input.taxId.trim(),
            planId: plan.id,
          },
        });
        const branch = await transaction.branch.create({
          data: {
            name: input.clinicName.trim(),
            addressId: address.id,
            headquarterId: headquarter.id,
          },
        });
        const createdUser = await transaction.user.create({
          data: {
            email,
            password,
            username: email,
            branchId: branch.id,
            addressId: address.id,
            roleId: adminRole.id,
            isActive: true,
            UserRole: { create: { roleId: adminRole.id } },
          },
        });
        await transaction.person.create({
          data: {
            firstName,
            lastName,
            email,
            phoneNumber: input.adminPhone.trim(),
            branchId: branch.id,
            addressId: address.id,
            roleId: adminRole.id,
            userId: createdUser.id,
          },
        });

        return transaction.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          select: USER_PROFILE,
        });
      });

      return this.createSession(user);
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

  async login(input: LoginCommand) {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isActive: true },
      select: { ...USER_PROFILE, password: true },
    });

    if (
      !user ||
      !(await this.hashService.compare(input.password, user.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user);
  }

  async getProfile(user: AuthUser) {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_PROFILE,
    });
    if (!profile) {
      throw new UnauthorizedException('User account is unavailable');
    }

    return this.toPublicProfile(profile);
  }

  async updateProfile(user: AuthUser, input: UpdateProfileCommand) {
    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email, deletedAt: null, id: { not: user.id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
    }

    const nameParts = input.name?.trim().replace(/\s+/g, ' ').split(' ');
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: email ? { email, username: email } : {},
      });

      if (nameParts || input.phone !== undefined || email) {
        const [firstName, ...lastNameParts] = nameParts ?? [];
        await transaction.person.updateMany({
          where: { userId: user.id, deletedAt: null },
          data: {
            ...(nameParts && {
              firstName,
              lastName: lastNameParts.join(' ') || firstName,
            }),
            ...(email && { email }),
            ...(input.phone !== undefined && {
              phoneNumber: input.phone.trim(),
            }),
          },
        });
      }
    });

    return this.getProfile({ ...user, email: email ?? user.email });
  }

  async logout(userId: string, jti: string, expiresAt: Date) {
    await this.prisma.revokedToken.create({
      data: { jti, expiresAt },
    });
  }

  private async createSession(
    user: Prisma.UserGetPayload<{ select: typeof USER_PROFILE }>,
  ) {
    const role = user.Role?.slug ?? 'staff';
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role,
      branchId: user.branchId,
      jti: randomUUID(),
    });

    return {
      accessToken,
      user: this.toPublicProfile(user),
    };
  }

  private toPublicProfile(
    user: Prisma.UserGetPayload<{ select: typeof USER_PROFILE }>,
  ) {
    const person = user.Person[0];
    const role = user.Role?.slug;
    return {
      id: user.id,
      name: [person?.firstName, person?.lastName].filter(Boolean).join(' '),
      email: user.email,
      phone: person?.phoneNumber ?? '',
      role:
        role === 'administrator' || role === 'admin'
          ? 'admin'
          : role === 'doctor' || role === 'nurse'
            ? role
            : 'secretary',
      avatar: '',
      permissions: resolvePermissions(
        role ?? 'staff',
        user.Role?.RolePermission.map(
          (assignment) => assignment.permission.slug,
        ) ?? [],
        user.UserPermission.map((override) => ({
          slug: override.permission.slug,
          granted: override.granted,
        })),
      ),
    };
  }
}
