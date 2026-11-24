import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import { DEFAULT_CLINIC_SCHEDULE } from '../../../shared/helpers/schedule';
import { IClinicScheduleRepository } from '../../domain/clinic-schedule.repository';
import { GetClinicScheduleUseCase } from './get-clinic-schedule/get-clinic-schedule-use-case';
import { UpdateClinicScheduleUseCase } from './update-clinic-schedule/update-clinic-schedule-use-case';

describe('ClinicScheduleUseCases', () => {
  const user: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const repository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const getSchedule = new GetClinicScheduleUseCase(
    repository as unknown as IClinicScheduleRepository,
  );
  const updateSchedule = new UpdateClinicScheduleUseCase(
    repository as unknown as IClinicScheduleRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('resolves and formats a branch default schedule', async () => {
    repository.findById.mockResolvedValue({
      deletedAt: null,
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    });

    await expect(getSchedule.execute({ user })).resolves.toMatchObject({
      workingDays: DEFAULT_CLINIC_SCHEDULE.workingDays,
      isDefault: true,
      timezone: 'Africa/Luanda',
      slotDurationMinutes: 30,
    });
    expect(repository.findById).toHaveBeenCalledWith('branch-1');
  });

  it('rejects a missing or deleted branch', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(getSchedule.execute({ user })).rejects.toBeInstanceOf(
      NotFoundException,
    );

    repository.findById.mockResolvedValue({
      deletedAt: new Date(),
      workingDays: [],
      workingHours: null,
      timezone: 'Africa/Luanda',
    });
    await expect(getSchedule.execute({ user })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('only lets administrators change clinic opening hours', async () => {
    await expect(
      updateSchedule.execute({
        user: { ...user, role: 'secretary' },
        schedule: DEFAULT_CLINIC_SCHEDULE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects invalid schedules and time zones before persistence', async () => {
    await expect(
      updateSchedule.execute({
        user,
        schedule: {
          workingDays: ['SEG'],
          workingHours: { SEG: { start: '18:00', end: '08:00' } },
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      updateSchedule.execute({
        user,
        schedule: {
          ...DEFAULT_CLINIC_SCHEDULE,
          timezone: 'Mars/Olympus',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('stores only listed days and returns the normalized schedule', async () => {
    repository.update.mockImplementation(
      async (
        _branchId: string,
        data: {
          workingDays: string[];
          workingHours: Record<string, { start: string; end: string }>;
          timezone?: string;
        },
      ) => ({
        deletedAt: null,
        ...data,
        timezone: data.timezone ?? 'Africa/Luanda',
      }),
    );
    const schedule = {
      workingDays: ['SEG'],
      workingHours: {
        SEG: { start: '09:00', end: '17:00' },
        DOM: { start: '09:00', end: '12:00' },
      },
    };

    await expect(
      updateSchedule.execute({ user, schedule }),
    ).resolves.toMatchObject({
      workingDays: ['SEG'],
      workingHours: { SEG: { start: '09:00', end: '17:00' } },
      isDefault: false,
    });
    expect(repository.update).toHaveBeenCalledWith('branch-1', {
      workingDays: ['SEG'],
      workingHours: { SEG: { start: '09:00', end: '17:00' } },
    });
  });
});
