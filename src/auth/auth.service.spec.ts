import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IHashService } from '../shared/application/interfaces/IHash';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { AuthPrismaRepository } from './infra/db/prisma/auth-prisma.repository';

describe('AuthPrismaRepository', () => {
  const account = {
    id: 'user-id',
    email: 'admin@example.test',
    password: 'bcrypt-hash',
    branchId: 'branch-id',
    Role: { slug: 'admin' },
    Person: [
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+244900000000',
      },
    ],
  };

  const prisma = {
    user: { findFirst: jest.fn() },
  } as unknown as PrismaService;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  } as unknown as JwtService;
  const hash = {
    compare: jest.fn(),
  } as unknown as IHashService;
  const service = new AuthPrismaRepository(prisma, jwt, hash);

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
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'admin@example.test',
        phone: '+244900000000',
        role: 'admin',
        avatar: '',
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

  it('rejects an incorrect password without returning account information', async () => {
    jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(account as never);
    jest.spyOn(hash, 'compare').mockResolvedValue(false);

    await expect(
      service.login({ email: account.email, password: 'incorrect-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
