import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { AuthPrismaRepository } from './auth-prisma.repository';

describe('AuthPrismaRepository email actions', () => {
  const authActionToken = {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  };
  const user = { update: jest.fn(), findUnique: jest.fn() };
  const refreshToken = { updateMany: jest.fn() };
  const transaction = { authActionToken, user, refreshToken };
  const prisma = {
    authActionToken,
    user,
    refreshToken,
    $transaction: jest.fn((operation: (tx: typeof transaction) => unknown) =>
      operation(transaction),
    ),
  } as unknown as PrismaService;
  const hashService = {
    hashPassword: jest.fn().mockResolvedValue('new-password-hash'),
    compare: jest.fn(),
  };
  const repository = new AuthPrismaRepository(
    prisma,
    {} as JwtService,
    hashService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    authActionToken.updateMany.mockResolvedValue({ count: 1 });
    user.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ branchId: null });
    refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it('activates an account once and enables login', async () => {
    authActionToken.findFirst.mockResolvedValue({
      id: 'activation-token-1',
      userId: 'user-1',
    });

    await repository.activateAccount('raw-activation-token');

    expect(authActionToken.findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        type: 'ACTIVATION',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      select: { id: true, userId: true },
    });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isEmailVerified: true, isActive: true },
    });
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { branchId: true },
    });
  });

  it('rejects an expired or reused activation token', async () => {
    authActionToken.findFirst.mockResolvedValue(null);

    await expect(
      repository.activateAccount('expired-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('changes the password once and revokes refresh sessions', async () => {
    authActionToken.findFirst.mockResolvedValue({
      id: 'reset-token-1',
      userId: 'user-1',
    });

    await repository.resetPassword('raw-reset-token', 'NewPassword123');

    expect(hashService.hashPassword).toHaveBeenCalledWith('NewPassword123');
    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-password-hash' },
    });
    expect(refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects an expired or reused password reset token', async () => {
    authActionToken.findFirst.mockResolvedValue(null);

    await expect(
      repository.resetPassword('expired-token', 'NewPassword123'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(hashService.hashPassword).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });
});
