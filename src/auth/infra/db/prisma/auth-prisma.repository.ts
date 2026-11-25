import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import {
  AuthAccountRecord,
  AuthActionTokenData,
  AuthActionTokenRecord,
  AuthActionTokenType,
  AuthActiveSubscriptionStatus,
  AuthAddressData,
  AuthHeadquarterData,
  AuthLoginRecord,
  AuthPersonData,
  AuthPlanRecord,
  AuthProfilePersonUpdate,
  AuthProfileRecord,
  AuthProfileUserUpdate,
  AuthRefreshSessionData,
  AuthRefreshSessionRecord,
  AuthSubscriptionStatus,
  AuthUserData,
  IAuthRepository,
} from '../../../domain/auth.repository';
import { DuplicateAuthEmailError } from '../../../domain/auth.errors';

const USER_PROFILE = {
  id: true,
  email: true,
  branchId: true,
  isActive: true,
  deletedAt: true,
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
  branch: {
    select: {
      deletedAt: true,
      headquarterId: true,
      headquarter: { select: { deletedAt: true, isActive: true } },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  private readonly client: Prisma.TransactionClient;

  constructor(
    private readonly prisma: PrismaService,
    client: Prisma.TransactionClient = prisma,
  ) {
    this.client = client;
  }

  transaction<T>(
    operation: (repository: IAuthRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((transaction) =>
      operation(new AuthPrismaRepository(this.prisma, transaction)),
    );
  }

  findUserByEmail(email: string): Promise<AuthAccountRecord | null> {
    return this.client.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        deletedAt: true,
        isActive: true,
        isEmailVerified: true,
        Person: {
          where: { deletedAt: null },
          select: { firstName: true, lastName: true },
          take: 1,
        },
      },
    });
  }

  findUserForLogin(email: string): Promise<AuthLoginRecord | null> {
    return this.client.user.findFirst({
      where: { email },
      select: { ...USER_PROFILE, password: true },
    });
  }

  findUserProfile(userId: string): Promise<AuthProfileRecord | null> {
    return this.client.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE,
    });
  }

  async findUserPassword(userId: string): Promise<string | null> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return user?.password ?? null;
  }

  findPlans(): Promise<AuthPlanRecord[]> {
    return this.client.plan.findMany({
      select: { id: true, createdAt: true, deletedAt: true },
    });
  }

  findAuthActionToken(
    tokenHash: string,
  ): Promise<AuthActionTokenRecord | null> {
    return this.client.authActionToken.findFirst({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        type: true,
        usedAt: true,
        expiresAt: true,
      },
    });
  }

  findRefreshSession(jti: string): Promise<AuthRefreshSessionRecord | null> {
    return this.client.refreshToken.findUnique({
      where: { jti },
      select: { jti: true, userId: true, revokedAt: true, expiresAt: true },
    });
  }

  findRevokedAccessToken(jti: string): Promise<{ jti: string } | null> {
    return this.client.revokedToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
  }

  findLatestClinicSubscription(
    headquarterId: string,
    statuses: AuthSubscriptionStatus[],
  ): Promise<{ expiresAt: Date } | null> {
    return this.client.clinicSubscription.findFirst({
      where: { headquarterId, status: { in: statuses } },
      orderBy: { createdAt: 'desc' },
      select: { expiresAt: true },
    });
  }

  async findClinicHeadquarterId(userId: string): Promise<string | null> {
    const user = await this.client.user.findUnique({
      where: { id: userId },
      select: { branch: { select: { headquarterId: true } } },
    });
    return user?.branch?.headquarterId ?? null;
  }

  async hasClinicSubscription(
    headquarterId: string,
    statuses: AuthActiveSubscriptionStatus[],
  ): Promise<boolean> {
    const subscription = await this.client.clinicSubscription.findFirst({
      where: { headquarterId, status: { in: statuses } },
      select: { id: true },
    });
    return subscription !== null;
  }

  async findProfileAvatarStorageKey(userId: string): Promise<string | null> {
    const person = await this.client.person.findFirst({
      where: { userId, deletedAt: null },
      select: { avatar: true },
    });
    return person?.avatar ?? null;
  }

  upsertRole(input: {
    slug: string;
    name: string;
    description: string;
    isSystem: boolean;
  }): Promise<{ id: string }> {
    return this.client.role.upsert({
      where: { slug: input.slug },
      create: input,
      update: {},
      select: { id: true },
    });
  }

  createAddress(data: AuthAddressData): Promise<{ id: string }> {
    return this.client.address.create({ data, select: { id: true } });
  }

  createHeadquarter(data: AuthHeadquarterData): Promise<{ id: string }> {
    return this.client.headquarter.create({
      data,
      select: { id: true },
    });
  }

  createBranch(data: {
    name: string;
    addressId: string;
    headquarterId: string;
  }): Promise<{ id: string }> {
    return this.client.branch.create({ data, select: { id: true } });
  }

  async createUser(data: AuthUserData): Promise<{ id: string }> {
    try {
      return await this.client.user.create({
        data: {
          ...data,
          UserRole: { create: { roleId: data.roleId } },
        },
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateAuthEmailError();
      }
      throw error;
    }
  }

  async createPerson(data: AuthPersonData): Promise<void> {
    await this.client.person.create({ data, select: { id: true } });
  }

  async createAuthActionToken(data: AuthActionTokenData): Promise<void> {
    await this.client.authActionToken.create({ data, select: { id: true } });
  }

  async claimAuthActionToken(id: string, now: Date): Promise<number> {
    const result = await this.client.authActionToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    return result.count;
  }

  async markUnusedAuthActionTokensUsed(
    userId: string,
    type: AuthActionTokenType,
    now: Date,
  ): Promise<void> {
    await this.client.authActionToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: now },
    });
  }

  async activateUser(userId: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, isActive: true },
    });
  }

  async createClinicSubscription(data: {
    headquarterId: string;
    status: 'TRIAL_ACTIVE';
    startsAt: Date;
    expiresAt: Date;
  }): Promise<void> {
    await this.client.clinicSubscription.create({
      data,
      select: { id: true },
    });
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await this.client.user.update({
      where: { id: userId },
      data: { password },
    });
  }

  async revokeUserRefreshSessions(userId: string, now: Date): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async createRefreshSession(data: AuthRefreshSessionData): Promise<void> {
    await this.client.refreshToken.create({ data, select: { jti: true } });
  }

  async claimRefreshSession(
    jti: string,
    userId: string,
    now: Date,
  ): Promise<number> {
    const result = await this.client.refreshToken.updateMany({
      where: { jti, userId, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    return result.count;
  }

  async updateUserProfile(
    userId: string,
    data: AuthProfileUserUpdate,
  ): Promise<void> {
    try {
      await this.client.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateAuthEmailError();
      }
      throw error;
    }
  }

  async updatePersonProfile(
    userId: string,
    data: AuthProfilePersonUpdate,
  ): Promise<void> {
    await this.client.person.updateMany({
      where: { userId, deletedAt: null },
      data,
    });
  }

  async updateProfileAvatarStorageKey(
    userId: string,
    storageKey: string,
  ): Promise<number> {
    const result = await this.client.person.updateMany({
      where: { userId, deletedAt: null },
      data: { avatar: storageKey },
    });
    return result.count;
  }

  async createRevokedToken(jti: string, expiresAt: Date): Promise<void> {
    await this.client.revokedToken.create({
      data: { jti, expiresAt },
      select: { jti: true },
    });
  }

  async revokeRefreshSession(
    jti: string,
    userId: string,
    now: Date,
  ): Promise<void> {
    await this.client.refreshToken.updateMany({
      where: { jti, userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  findUserEmailOwner(
    email: string,
    excludedUserId: string,
  ): Promise<{ id: string } | null> {
    return this.client.user.findFirst({
      where: { email, deletedAt: null, id: { not: excludedUserId } },
      select: { id: true },
    });
  }
}
