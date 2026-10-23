import { AuthUser } from '../../auth/auth-user';
import { PrismaService } from '../../shared/infra/db/prisma/prisma.service';
import { PlatformAdminService } from './platform-admin.service';

describe('PlatformAdminService', () => {
  const actor = { id: 'platform-owner-id' } as AuthUser;

  function createContext() {
    const transaction = {
      headquarter: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      branch: { findMany: jest.fn() },
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      platformAdminAudit: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        (operation: (tx: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    } as unknown as PrismaService;

    return {
      service: new PlatformAdminService(prisma),
      transaction,
    };
  }

  it('deactivates a clinic, revokes its sessions, and preserves clinic data', async () => {
    const { service, transaction } = createContext();
    transaction.headquarter.findFirst.mockResolvedValue({
      id: 'clinic-id',
      isActive: true,
    });
    transaction.branch.findMany.mockResolvedValue([{ id: 'branch-id' }]);
    transaction.user.findMany.mockResolvedValue([{ id: 'staff-id' }]);
    transaction.headquarter.update.mockResolvedValue({
      id: 'clinic-id',
      isActive: false,
    });

    await expect(
      service.setClinicStatus('clinic-id', actor, false),
    ).resolves.toEqual({ id: 'clinic-id', isActive: false });

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['staff-id'] }, revokedAt: null },
      }),
    );
    expect(transaction.headquarter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic-id' },
        data: { isActive: false },
      }),
    );
    expect(transaction.platformAdminAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          headquarterId: 'clinic-id',
          actorUserId: actor.id,
          action: 'CLINIC_DEACTIVATED',
        }),
      }),
    );
    expect(transaction.headquarter).not.toHaveProperty('delete');
    expect(transaction.branch).not.toHaveProperty('deleteMany');
  });

  it('blocks a staff account and revokes its sessions', async () => {
    const { service, transaction } = createContext();
    transaction.headquarter.findFirst.mockResolvedValue({ id: 'clinic-id' });
    transaction.branch.findMany.mockResolvedValue([{ id: 'branch-id' }]);
    transaction.user.findFirst.mockResolvedValue({
      id: 'staff-id',
      isActive: true,
      email: 'staff@clinic.test',
    });

    await expect(
      service.setUserStatus('clinic-id', 'staff-id', actor, false),
    ).resolves.toEqual({ id: 'staff-id', isActive: false });

    expect(transaction.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: { in: ['branch-id'] },
          Role: { slug: { in: expect.arrayContaining(['doctor', 'admin']) } },
        }),
      }),
    );
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'staff-id' },
      data: { isActive: false },
    });
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'staff-id', revokedAt: null },
      }),
    );
    expect(transaction.platformAdminAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          headquarterId: 'clinic-id',
          targetUserId: 'staff-id',
          action: 'USER_BLOCKED',
        }),
      }),
    );
  });
});
