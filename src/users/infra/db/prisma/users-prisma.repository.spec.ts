import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { UsersPrismaRepository } from './users-prisma.repository';

describe('UsersPrismaRepository', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const target = {
    id: 'user-2',
    email: 'nurse@example.test',
    isActive: true,
    Role: { slug: 'nurse' },
    Person: [
      {
        id: 'person-2',
        firstName: 'Joana',
        lastName: 'Gomes',
        phoneNumber: '+244900000000',
      },
    ],
    doctorProfile: null,
  };

  const userModel = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const tx = {
    user: userModel,
    role: { upsert: jest.fn() },
    address: { create: jest.fn() },
    person: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    doctorProfile: { create: jest.fn(), upsert: jest.fn() },
    userRole: { deleteMany: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    user: userModel,
    $transaction: jest.fn((callback: (client: unknown) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaService;
  const repository = new UsersPrismaRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (operation: Promise<unknown>[] | ((client: unknown) => unknown)) =>
        Array.isArray(operation) ? Promise.all(operation) : operation(tx),
    );
    userModel.count.mockResolvedValue(1);
  });

  it('lists users of the caller branch only', async () => {
    userModel.findMany.mockResolvedValue([target]);

    const {
      data: [result],
    } = await repository.list(admin);

    expect(userModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { branchId: 'branch-1', deletedAt: null, createdAt: {} },
      }),
    );
    expect(result).toMatchObject({
      name: 'Joana Gomes',
      role: 'nurse',
      active: true,
    });
  });

  it('refuses duplicated emails before creating anything', async () => {
    userModel.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      repository.create(admin, {
        name: 'New User',
        email: ' Nurse@Example.test ',
        role: 'nurse',
        passwordHash: 'hashed',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userModel.findFirst).toHaveBeenCalledWith({
      where: { email: 'nurse@example.test' },
      select: { id: true },
    });
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('stores a hashed password and a doctor profile for doctors', async () => {
    userModel.findFirst.mockResolvedValue(null);
    tx.role.upsert.mockResolvedValue({ id: 'role-doctor' });
    tx.address.create.mockResolvedValue({ id: 'address-1' });
    userModel.create.mockResolvedValue({ id: 'user-9' });
    userModel.findUniqueOrThrow.mockResolvedValue({
      ...target,
      id: 'user-9',
      Role: { slug: 'doctor' },
    });

    await repository.create(admin, {
      name: 'Dr Who',
      email: 'doctor@example.test',
      role: 'doctor',
      passwordHash: 'hashed',
    });

    expect(userModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        password: 'hashed',
        branchId: 'branch-1',
        roleId: 'role-doctor',
      }),
    });
    expect(tx.doctorProfile.create).toHaveBeenCalledWith({
      data: { userId: 'user-9' },
    });
  });

  it('does not reach users of another branch', async () => {
    userModel.findFirst.mockResolvedValue(null);

    await expect(
      repository.setStatus(admin, 'foreign-user', { active: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(userModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-user', branchId: 'branch-1', deletedAt: null },
      }),
    );
  });

  it('keeps at least one active administrator', async () => {
    userModel.findFirst.mockResolvedValue({
      ...target,
      Role: { slug: 'admin' },
    });
    userModel.count.mockResolvedValue(0);

    await expect(
      repository.setStatus(admin, 'user-2', { active: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('soft deletes the user together with the linked person record', async () => {
    userModel.findFirst.mockResolvedValue(target);

    await expect(repository.remove(admin, 'user-2')).resolves.toEqual({
      id: 'user-2',
      deleted: true,
    });
    expect(userModel.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { isActive: false, deletedAt: expect.any(Date) },
    });
    expect(tx.person.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-2', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
