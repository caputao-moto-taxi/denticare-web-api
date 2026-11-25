import { DaySchedule } from '../../shared/helpers/schedule';

export type UpdateClinicScheduleCommand = {
  workingDays: string[];
  workingHours: Record<string, DaySchedule>;
  timezone?: string;
};

export type ClinicScheduleRecord = {
  deletedAt: Date | null;
  workingDays: string[];
  workingHours: unknown;
  timezone: string;
};

export type ClinicScheduleUpdateData = {
  workingDays: string[];
  workingHours: Record<string, DaySchedule>;
  timezone?: string;
};

export abstract class IClinicScheduleRepository {
  abstract findById(branchId: string): Promise<ClinicScheduleRecord | null>;
  abstract update(
    branchId: string,
    data: ClinicScheduleUpdateData,
  ): Promise<ClinicScheduleRecord>;
}
