import { ListQuery } from '../../shared/domain/list-query';
export type DoctorCreateCommand = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address: string;
  avatar?: string;
  type?: 'FULL_TIME' | 'PART_TIME';
  crmNumber?: string;
  specialties?: string[];
  workingDays?: string[];
  workingHours?: Record<string, unknown>;
  daysOffNotes?: string;
  passwordHash: string;
};

export type DoctorUpdateCommand = Partial<
  Omit<DoctorCreateCommand, 'passwordHash'>
>;

export abstract class IDoctorRepository {
  abstract emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  abstract list(branchId: string, query?: ListQuery): Promise<unknown>;
  abstract findOne(branchId: string, id: string): Promise<unknown>;
  abstract create(
    branchId: string,
    input: DoctorCreateCommand,
  ): Promise<unknown>;
  abstract update(
    branchId: string,
    id: string,
    input: DoctorUpdateCommand,
  ): Promise<unknown>;
  abstract getAvatarStorageKey(
    branchId: string,
    id: string,
  ): Promise<string | null>;
  abstract updateAvatarStorageKey(
    branchId: string,
    id: string,
    storageKey: string,
  ): Promise<void>;
  abstract remove(branchId: string, id: string): Promise<unknown>;
}
