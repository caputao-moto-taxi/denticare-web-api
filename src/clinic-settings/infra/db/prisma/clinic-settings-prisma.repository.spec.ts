import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { ClinicSettingsPrismaRepository } from './clinic-settings-prisma.repository';

describe('ClinicSettingsPrismaRepository', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const branch = { findFirst: jest.fn() };
  const clinicService = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const repository = new ClinicSettingsPrismaRepository({
    branch,
    clinicService,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('restricts settings access to clinic administrators', async () => {
    await expect(
      repository.listServices({ ...admin, role: 'doctor' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(clinicService.findMany).not.toHaveBeenCalled();
  });

  it('includes the province in clinic settings', async () => {
    branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      name: 'Luanda Clinic',
      address: {
        street: 'Main street',
        province: 'Luanda',
        city: 'Luanda',
        country: 'Angola',
      },
      headquarter: {
        name: 'Luanda Clinic',
        description: null,
        email: null,
        phone: null,
        nif: '1234567890',
        address: 'Main street',
        logo: null,
      },
    });

    await expect(repository.getSettings(admin)).resolves.toMatchObject({
      province: 'Luanda',
      city: 'Luanda',
      country: 'Angola',
    });
  });

  it('lists services only for the caller branch', async () => {
    clinicService.findMany.mockResolvedValue([]);

    await repository.listServices(admin);

    expect(clinicService.findMany).toHaveBeenCalledWith({
      where: { branchId: 'branch-1', deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  });

  it('creates services with the caller branch id', async () => {
    clinicService.create.mockResolvedValue({
      id: 'service-1',
      name: 'Cleaning',
      description: null,
      price: 5000,
      durationMinutes: 30,
    });

    await repository.createService(admin, {
      name: '  Cleaning  ',
      price: 5000,
      durationMinutes: 30,
    });

    expect(clinicService.create).toHaveBeenCalledWith({
      data: {
        branchId: 'branch-1',
        name: 'Cleaning',
        description: null,
        price: 5000,
        durationMinutes: 30,
      },
    });
  });

  it('does not update a service owned by another branch', async () => {
    clinicService.findFirst.mockResolvedValue(null);

    await expect(
      repository.updateService(admin, 'foreign-service', { price: 100 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(clinicService.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'foreign-service',
        branchId: 'branch-1',
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(clinicService.update).not.toHaveBeenCalled();
  });

  it('returns only public clinic details and services for active branches', async () => {
    branch.findFirst.mockResolvedValue({
      id: 'branch-1',
      address: { street: 'Main street', city: 'Luanda', country: 'Angola' },
      headquarter: {
        name: 'Dental Care',
        description: 'Dental clinic',
        email: 'hello@example.test',
        phone: '+244900000000',
        nif: 'private-tax-id',
        address: 'Main street',
        logo: null,
      },
      clinicServices: [
        {
          id: 'service-1',
          name: 'Cleaning',
          description: null,
          price: 5000,
          durationMinutes: 30,
        },
      ],
    });

    const result = await repository.getPublicClinic('branch-1');

    expect(branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'branch-1', deletedAt: null, isActive: true },
      }),
    );
    expect(result).toEqual({
      id: 'branch-1',
      name: 'Dental Care',
      description: 'Dental clinic',
      email: 'hello@example.test',
      phone: '+244900000000',
      address: 'Main street',
      city: 'Luanda',
      country: 'Angola',
      logoUrl: null,
      services: [
        {
          id: 'service-1',
          name: 'Cleaning',
          description: '',
          price: 5000,
          durationMinutes: 30,
        },
      ],
    });
  });
});
