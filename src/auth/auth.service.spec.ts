import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthPrismaRepository } from './infra/db/prisma/auth-prisma.repository';

describe('AuthPrismaRepository', () => {
  const account = {
    id: 'user-id',
    email: 'admin@example.test',
    password: 'bcrypt-hash',
    isActive: true,
    branchId: 'branch-id',
    branch: {
      deletedAt: null,
      headquarter: { deletedAt: null, isActive: true },
    },
    Role: { slug: 'admin', RolePermission: [] },
    Person: [
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+244900000000',
      },
    ],
    UserPermission: [],
  };

  const prisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
  const hash = {
    compare: jest.fn(),
    hashPassword: jest.fn(),
  } as unknown as IHashService;
  const service = new AuthPrismaRepository(prisma, jwt, hash);
  const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

  beforeAll(() => {
    process.env.JWT_REFRESH_SECRET = 'auth-service-refresh-test-secret';
  });

  afterAll(() => {
    if (originalRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates active users and returns a public profile with a signed token', async () => {
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(account as never);
    jest.spyOn(hash, 'compare').mockResolvedValue(true);

    await expect(
      service.login({
        email: ' ADMIN@example.test ',
        password: 'valid-password',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'admin@example.test',
        phone: '+244900000000',
        role: 'admin',
        avatar: '',
        permissions: expect.arrayContaining([
          'dashboard.view',
          'appointments.manage',
          'stock.sell',
        ]),
      },
    });
    expect(hash.compare).toHaveBeenCalledWith('valid-password', 'bcrypt-hash');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-id',
        email: 'admin@example.test',
        branchId: 'branch-id',
        role: 'admin',
        jti: expect.any(String),
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        jti: expect.any(String),
        userId: 'user-id',
        expiresAt: expect.any(Date),
      },
    });
  });

  it('returns the same authentication error when the account is missing', async () => {
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@example.test',
        password: 'valid-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(hash.compare).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts before comparing the password', async () => {
    jest
      .spyOn(prisma.user, 'findFirst')
      .mockResolvedValue({ ...account, isActive: false } as never);

    await expect(
      service.login({ email: account.email, password: 'valid-password' }),
    ).rejects.toThrow('User account is not active');
    expect(hash.compare).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password without returning account information', async () => {
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(account as never);
    jest.spyOn(hash, 'compare').mockResolvedValue(false);

    await expect(
      service.login({ email: account.email, password: 'incorrect-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token and persists the replacement session', async () => {
    const transaction = {
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation((callback: never) => callback(transaction as never));
    jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
      jti: 'old-session',
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    });
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(account as never);
    jest.spyOn(jwt, 'verifyAsync').mockResolvedValue({
      sub: 'user-id',
      jti: 'old-session',
      type: 'refresh',
    } as never);

    await expect(
      service.refresh({ refreshToken: 'valid-refresh-token' }),
    ).resolves.toMatchObject({
      accessToken: 'signed-token',
      refreshToken: 'signed-token',
      user: { id: 'user-id' },
    });
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ jti: 'old-session', revokedAt: null }),
      }),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledWith({
      data: {
        jti: expect.any(String),
        userId: 'user-id',
        expiresAt: expect.any(Date),
      },
    });
  });

  it('rejects a refresh token whose session has already been revoked', async () => {
    jest.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
      jti: 'revoked-session',
      userId: 'user-id',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
    });
    jest.spyOn(jwt, 'verifyAsync').mockResolvedValue({
      sub: 'user-id',
      jti: 'revoked-session',
      type: 'refresh',
    } as never);

    await expect(
      service.refresh({ refreshToken: 'replayed-refresh-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('changes profile details and stores only a hash of the new password', async () => {
    const transaction = {
      user: { update: jest.fn() },
      person: { updateMany: jest.fn() },
    };
    jest
      .spyOn(prisma, '$transaction')
      .mockImplementation((callback: never) => callback(transaction as never));
    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValueOnce({ password: 'current-hash' } as never)
      .mockResolvedValueOnce(account as never);
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    jest.spyOn(hash, 'compare').mockResolvedValue(true);
    jest.spyOn(hash, 'hashPassword').mockResolvedValue('new-password-hash');

    await service.updateProfile(
      {
        id: 'user-id',
        email: account.email,
        role: 'admin',
        branchId: 'branch-id',
      },
      {
        name: 'Ada Byron',
        email: ' ADA@example.test ',
        phone: '+244911111111',
        currentPassword: 'CurrentPass1',
        newPassword: 'NewPassword1',
      },
    );

    expect(hash.compare).toHaveBeenCalledWith('CurrentPass1', 'current-hash');
    expect(hash.hashPassword).toHaveBeenCalledWith('NewPassword1');
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        email: 'ada@example.test',
        username: 'ada@example.test',
        password: 'new-password-hash',
      },
    });
    expect(transaction.person.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Ada',
          lastName: 'Byron',
          phoneNumber: '+244911111111',
        }),
      }),
    );
  });

  it('rejects a password change when the current password is incorrect', async () => {
    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue({ password: 'current-hash' } as never);
    jest.spyOn(hash, 'compare').mockResolvedValue(false);

    await expect(
      service.updateProfile(
        {
          id: 'user-id',
          email: account.email,
          role: 'admin',
          branchId: 'branch-id',
        },
        { currentPassword: 'wrong-password', newPassword: 'NewPassword1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(hash.hashPassword).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
