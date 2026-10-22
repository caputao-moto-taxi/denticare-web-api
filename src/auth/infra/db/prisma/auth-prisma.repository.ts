import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../../../../generated/prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthUser } from '../../../auth-user';
import { resolvePermissions } from '../../../permissions';
import {
  IAuthRepository,
  AuthActionEmail,
  AuthActionTokenType,
  LoginCommand,
  RefreshCommand,
  RegisterCommand,
  UpdateProfileCommand,
} from '../../../domain/auth.repository';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

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
    select: {
      firstName: true,
      lastName: true,
      phoneNumber: true,
      avatar: true,
    },
    take: 1,
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly hashService: IHashService,
  ) { }

  async register(input: RegisterCommand): Promise<AuthActionEmail> {
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
      return await this.prisma.$transaction(async (transaction) => {
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
            isActive: false,
            isEmailVerified: false,
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
        const token = await this.issueAuthActionToken(
          transaction,
          createdUser.id,
          'ACTIVATION',
          24 * 60 * 60 * 1000,
        );
        return { email, displayName: normalizedName, token };
      });
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

  async createActivationRequest(
    email: string,
  ): Promise<AuthActionEmail | null> {
    const account = await this.findPendingAccount(email);
    if (!account) return null;
    const token = await this.prisma.$transaction((transaction) =>
      this.issueAuthActionToken(
        transaction,
        account.id,
        'ACTIVATION',
        24 * 60 * 60 * 1000,
      ),
    );
    return {
      email: account.email,
      displayName: this.personName(account.Person[0]),
      token,
    };
  }

  async activateAccount(token: string) {
    const now = new Date();
    const action = await this.prisma.authActionToken.findFirst({
      where: {
        tokenHash: this.hashActionToken(token),
        type: 'ACTIVATION',
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true },
    });
    if (!action) {
      throw new BadRequestException('Invalid or expired activation link');
    }

    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.authActionToken.updateMany({
        where: { id: action.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or expired activation link');
      }
      await transaction.user.update({
        where: { id: action.userId },
        data: { isEmailVerified: true, isActive: true },
      });
      await transaction.authActionToken.updateMany({
        where: {
          userId: action.userId,
          type: 'ACTIVATION',
          usedAt: null,
        },
        data: { usedAt: now },
      });
    });
  }

  async createPasswordResetRequest(
    email: string,
  ): Promise<AuthActionEmail | null> {
    const account = await this.prisma.user.findFirst({
      where: {
        email: email.trim(),
        deletedAt: null,
        isActive: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        Person: {
          where: { deletedAt: null },
          select: { firstName: true, lastName: true },
          take: 1,
        },
      },
    });

    if (!account) return null;

    const token = await this.prisma.$transaction((transaction) =>
      this.issueAuthActionToken(
        transaction,
        account.id,
        'PASSWORD_RESET',
        60 * 60 * 1000,
      ),
    );
    return {
      email: account.email,
      displayName: this.personName(account.Person[0]),
      token,
    };
  }

  async resetPassword(token: string, password: string) {
    const now = new Date();
    const action = await this.prisma.authActionToken.findFirst({
      where: {
        tokenHash: this.hashActionToken(token),
        type: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true },
    });
    if (!action) {
      throw new BadRequestException('Invalid or expired password reset link');
    }
    const passwordHash = await this.hashService.hashPassword(password);

    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.authActionToken.updateMany({
        where: {
          id: action.id,
          type: 'PASSWORD_RESET',
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or expired password reset link');
      }
      await transaction.user.update({
        where: { id: action.userId },
        data: { password: passwordHash },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: action.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.authActionToken.updateMany({
        where: {
          userId: action.userId,
          type: 'PASSWORD_RESET',
          usedAt: null,
        },
        data: { usedAt: now },
      });
    });
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

  async refresh(input: RefreshCommand) {
    let payload: { sub: string; jti: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(input.refreshToken, {
        secret: this.refreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload.sub || !payload.jti || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = new Date();
    const currentSession = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });
    if (
      !currentSession ||
      currentSession.userId !== payload.sub ||
      currentSession.revokedAt ||
      currentSession.expiresAt <= now
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
      select: USER_PROFILE,
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const tokens = await this.createTokenPair(user, sessionId);
    const rotation = await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: {
          jti: currentSession.jti,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      if (revoked.count !== 1) {
        return false;
      }

      await transaction.refreshToken.create({
        data: { jti: sessionId, userId: user.id, expiresAt },
      });
      return true;
    });

    if (!rotation) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return tokens;
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
    let passwordHash: string | undefined;
    if (input.newPassword !== undefined) {
      if (!input.currentPassword) {
        throw new BadRequestException('Current password is incorrect');
      }
      const account = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });
      if (
        !account ||
        !(await this.hashService.compare(
          input.currentPassword,
          account.password,
        ))
      ) {
        throw new BadRequestException('Current password is incorrect');
      }
      passwordHash = await this.hashService.hashPassword(input.newPassword);
    }

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
        data: {
          ...(email && { email, username: email }),
          ...(passwordHash && { password: passwordHash }),
        },
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

  async getProfileAvatarStorageKey(user: AuthUser) {
    const person = await this.prisma.person.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { avatar: true },
    });
    const storageKey = person?.avatar;
    return storageKey?.startsWith(`users/${user.id}/avatar/`)
      ? storageKey
      : null;
  }

  async updateProfileAvatarStorageKey(user: AuthUser, storageKey: string) {
    const updated = await this.prisma.person.updateMany({
      where: { userId: user.id, deletedAt: null },
      data: { avatar: storageKey },
    });
    if (updated.count === 0) {
      throw new NotFoundException('User profile is unavailable');
    }
  }

  async logout(
    userId: string,
    jti: string,
    expiresAt: Date,
    sessionId?: string,
  ) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.revokedToken.create({
        data: { jti, expiresAt },
      });
      if (sessionId) {
        await transaction.refreshToken.updateMany({
          where: { jti: sessionId, userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
  }

  private async issueAuthActionToken(
    transaction: Prisma.TransactionClient,
    userId: string,
    type: AuthActionTokenType,
    ttlMilliseconds: number,
  ) {
    const now = new Date();
    const token = randomBytes(32).toString('base64url');
    await transaction.authActionToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: now },
    });
    await transaction.authActionToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashActionToken(token),
        expiresAt: new Date(now.getTime() + ttlMilliseconds),
      },
    });
    return token;
  }

  private async findPendingAccount(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        deletedAt: null,
        isActive: false,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        Person: {
          where: { deletedAt: null },
          select: { firstName: true, lastName: true },
          take: 1,
        },
      },
    });
  }

  private personName(person?: { firstName: string; lastName: string }) {
    return [person?.firstName, person?.lastName].filter(Boolean).join(' ');
  }

  private hashActionToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createSession(
    user: Prisma.UserGetPayload<{ select: typeof USER_PROFILE }>,
  ) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const tokens = await this.createTokenPair(user, sessionId);
    await this.prisma.refreshToken.create({
      data: { jti: sessionId, userId: user.id, expiresAt },
    });
    return tokens;
  }

  private async createTokenPair(
    user: Prisma.UserGetPayload<{ select: typeof USER_PROFILE }>,
    sessionId: string,
  ) {
    const role = user.Role?.slug ?? 'staff';
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role,
      branchId: user.branchId,
      jti: randomUUID(),
      sid: sessionId,
    });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: sessionId, type: 'refresh' },
      {
        secret: this.refreshTokenSecret(),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      },
    );

    return {
      accessToken,
      refreshToken,
      user: this.toPublicProfile(user),
    };
  }

  private refreshTokenSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET must be configured');
    }
    return secret;
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
      avatar: person?.avatar?.startsWith(`users/${user.id}/avatar/`)
        ? '/auth/me/avatar'
        : '',
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
