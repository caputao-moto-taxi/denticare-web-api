import { AuthUser } from '../../auth/auth-user';
import { DaySchedule } from '../../shared/helpers/schedule';

export type UpdateClinicScheduleCommand = {
  workingDays: string[];
  workingHours: Record<string, DaySchedule>;
  timezone?: string;
};

export abstract class IClinicScheduleRepository {
  abstract get(user: AuthUser): Promise<unknown>;
  abstract update(
    user: AuthUser,
    input: UpdateClinicScheduleCommand,
  ): Promise<unknown>;
}
