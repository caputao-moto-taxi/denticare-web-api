import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { IAuthRepository } from '../../../domain/auth.repository';
import { AuthPrismaRepository } from './auth-prisma.repository';

describe('AuthPrismaRepository', () => {
  const authActionToken = {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  };
  const user = { findFirst: jest.fn() };
  const transactionClient = { authActionToken };
  const prismaMock = {
    authActionToken,
    user,
    $transaction: jest.fn(),
  };
  const repository = new AuthPrismaRepository(
    prismaMock as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries an account by email without applying account-state rules', async () => {
    const account = {
      id: 'user-id',
      email: 'user@example.test',
      deletedAt: new Date(),
      isActive: false,
      isEmailVerified: false,
      Person: [],
    };
    user.findFirst.mockResolvedValue(account);

    await expect(repository.findUserByEmail('user@example.test')).resolves.toBe(
      account,
    );
    expect(user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'user@example.test' },
        select: expect.objectContaining({
          deletedAt: true,
          isActive: true,
          isEmailVerified: true,
        }),
      }),
    );
  });

  it('claims an unused, unexpired action token with one database update', async () => {
    authActionToken.updateMany.mockResolvedValue({ count: 1 });
    const now = new Date();

    await expect(
      repository.claimAuthActionToken('token-id', now),
    ).resolves.toBe(1);
    expect(authActionToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'token-id', usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
  });

  it('runs use-case persistence operations inside a transaction', async () => {
    prismaMock.$transaction.mockImplementation(
      (operation: (client: typeof transactionClient) => Promise<unknown>) =>
        operation(transactionClient),
    );
    authActionToken.create.mockResolvedValue({ id: 'token-id' });

    await repository.transaction((transaction: IAuthRepository) =>
      transaction.createAuthActionToken({
        userId: 'user-id',
        type: 'ACTIVATION',
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
      }),
    );

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(authActionToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-id',
          type: 'ACTIVATION',
          tokenHash: 'hashed-token',
        }),
      }),
    );
  });
});
