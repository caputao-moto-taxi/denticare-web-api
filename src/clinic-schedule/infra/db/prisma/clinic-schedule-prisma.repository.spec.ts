import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';
import { ClinicSchedulePrismaRepository } from './clinic-schedule-prisma.repository';

describe('ClinicSchedulePrismaRepository', () => {
  const branch = { findUnique: jest.fn(), update: jest.fn() };
  const repository = new ClinicSchedulePrismaRepository({
    branch,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('loads the schedule fields by branch identifier', async () => {
    const record = {
      deletedAt: null,
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    };
    branch.findUnique.mockResolvedValue(record);

    await expect(repository.findById('branch-1')).resolves.toEqual(record);
    expect(branch.findUnique).toHaveBeenCalledWith({
      where: { id: 'branch-1' },
      select: {
        deletedAt: true,
        workingDays: true,
        workingHours: true,
        timezone: true,
      },
    });
  });

  it('persists schedule data without applying authorization or validation rules', async () => {
    const data = {
      workingDays: ['SEG'],
      workingHours: { SEG: { start: '09:00', end: '17:00' } },
      timezone: 'Africa/Luanda',
    };
    const record = { deletedAt: null, ...data };
    branch.update.mockResolvedValue(record);

    await expect(repository.update('branch-1', data)).resolves.toEqual(record);
    expect(branch.update).toHaveBeenCalledWith({
      where: { id: 'branch-1' },
      data,
      select: {
        deletedAt: true,
        workingDays: true,
        workingHours: true,
        timezone: true,
      },
    });
  });
});
