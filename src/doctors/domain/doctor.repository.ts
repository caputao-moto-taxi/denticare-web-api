import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';
export type DoctorCreateCommand = {
  name: string;
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
};

export type DoctorUpdateCommand = Partial<DoctorCreateCommand>;

export abstract class IDoctorRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract create(user: AuthUser, input: DoctorCreateCommand): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: DoctorUpdateCommand,
  ): Promise<unknown>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
}
