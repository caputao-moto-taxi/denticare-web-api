import { AuthUser } from '../../../../auth/auth-user';
import { IClinicScheduleRepository } from '../../domain/clinic-schedule.repository';
import { GetClinicScheduleUseCase } from './get-clinic-schedule/get-clinic-schedule-use-case';
import { UpdateClinicScheduleUseCase } from './update-clinic-schedule/update-clinic-schedule-use-case';

describe('ClinicScheduleUseCases', () => {
  const user: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const repository = {
    get: jest.fn(),
    update: jest.fn(),
  };
  const getSchedule = new GetClinicScheduleUseCase(
    repository as unknown as IClinicScheduleRepository,
  );
  const updateSchedule = new UpdateClinicScheduleUseCase(
    repository as unknown as IClinicScheduleRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('delegates schedule reads to the repository', async () => {
    repository.get.mockResolvedValue({ workingDays: ['MON'] });

    await expect(getSchedule.execute({ user })).resolves.toEqual({
      workingDays: ['MON'],
    });
    expect(repository.get).toHaveBeenCalledWith(user);
  });

  it('delegates schedule updates to the repository', async () => {
    const schedule = {
      workingDays: ['MON'],
      workingHours: { MON: { start: '08:00', end: '17:00' } },
    };
    repository.update.mockResolvedValue(schedule);

    await expect(updateSchedule.execute({ user, schedule })).resolves.toBe(
      schedule,
    );
    expect(repository.update).toHaveBeenCalledWith(user, schedule);
  });
});
