import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { DEFAULT_CLINIC_SCHEDULE } from '../../../../shared/helpers/schedule';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { ClinicSchedulePrismaRepository } from './clinic-schedule-prisma.repository';

describe('ClinicSchedulePrismaRepository', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const branch = { findFirst: jest.fn(), update: jest.fn() };
  const repository = new ClinicSchedulePrismaRepository({
    branch,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('returns the default schedule for branches that never set one', async () => {
    branch.findFirst.mockResolvedValue({
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    });

    await expect(repository.get(admin)).resolves.toMatchObject({
      workingDays: DEFAULT_CLINIC_SCHEDULE.workingDays,
      isDefault: true,
      timezone: 'Africa/Luanda',
      slotDurationMinutes: 30,
    });
    expect(branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'branch-1', deletedAt: null },
      }),
    );
  });

  it('only lets administrators change the opening hours', async () => {
    await expect(
      repository.update(
        { ...admin, role: 'secretary' },
        DEFAULT_CLINIC_SCHEDULE,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid schedules and time zones', async () => {
    await expect(
      repository.update(admin, {
        workingDays: ['SEG'],
        workingHours: { SEG: { start: '18:00', end: '08:00' } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      repository.update(admin, {
        ...DEFAULT_CLINIC_SCHEDULE,
        timezone: 'Mars/Olympus',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(branch.update).not.toHaveBeenCalled();
  });

  it('stores only the listed working days for the caller branch', async () => {
    branch.update.mockImplementation(({ data }: { data: object }) => ({
      ...data,
      timezone: 'Africa/Luanda',
    }));

    const result = await repository.update(admin, {
      workingDays: ['SEG'],
      workingHours: {
        SEG: { start: '09:00', end: '17:00' },
        DOM: { start: '09:00', end: '12:00' },
      },
    });

    expect(branch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'branch-1' },
        data: {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '09:00', end: '17:00' } },
        },
      }),
    );
    expect(result).toMatchObject({ workingDays: ['SEG'], isDefault: false });
  });
});
