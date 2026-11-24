import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IClinicScheduleRepository,
  UpdateClinicScheduleCommand,
} from '../../../domain/clinic-schedule.repository';
import {
  isValidTimezone,
  validateWeeklySchedule,
} from '../../../../shared/helpers/schedule';
import { toClinicScheduleView } from '../shared/clinic-schedule-view';

export type UpdateClinicScheduleInput = {
  user: AuthUser;
  schedule: UpdateClinicScheduleCommand;
};

export class UpdateClinicScheduleUseCase {
  constructor(private readonly repository: IClinicScheduleRepository) {}

  async execute({ user, schedule }: UpdateClinicScheduleInput) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can change the opening hours',
      );
    }

    const problems = validateWeeklySchedule(schedule);
    if (
      schedule.timezone !== undefined &&
      !isValidTimezone(schedule.timezone)
    ) {
      problems.push('timezone must be a valid IANA time zone');
    }
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }

    const workingHours = Object.fromEntries(
      schedule.workingDays.map((day) => {
        const { start, end, lunchStart, lunchEnd } = schedule.workingHours[day];
        return [
          day,
          {
            start,
            end,
            ...(lunchStart && lunchEnd && { lunchStart, lunchEnd }),
          },
        ];
      }),
    );
    const branch = await this.repository.update(user.branchId, {
      workingDays: schedule.workingDays,
      workingHours,
      ...(schedule.timezone !== undefined && { timezone: schedule.timezone }),
    });
    return toClinicScheduleView(branch);
  }
}
