import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';

export type StaffRole = 'admin' | 'doctor' | 'nurse' | 'secretary';

export type UserCreateCommand = {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  password: string;
};

export type UserUpdateCommand = {
  name?: string;
  phone?: string;
  role?: StaffRole;
};

export type UserStatusCommand = { active: boolean };

export type UserPermissionCommand = { permissions: string[] };

export abstract class IUserRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract getPermissions(user: AuthUser, id: string): Promise<unknown>;
  abstract setPermissions(
    user: AuthUser,
    id: string,
    input: UserPermissionCommand,
  ): Promise<unknown>;
  abstract create(user: AuthUser, input: UserCreateCommand): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: UserUpdateCommand,
  ): Promise<unknown>;
  abstract setStatus(
    user: AuthUser,
    id: string,
    input: UserStatusCommand,
  ): Promise<unknown>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
}
