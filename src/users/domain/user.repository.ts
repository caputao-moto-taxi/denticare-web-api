import { AuthUser } from '../../auth/auth-user';
import { ListQuery, PaginatedResult } from '../../shared/domain/list-query';
import { User } from './user.entity';
import { StaffRole } from './user.roles';

export { STAFF_ROLES, StaffRole } from './user.roles';

export type UserPermissionView = {
  slug: string;
  name: string;
  description: string;
  roleDefault: boolean;
  overridden: boolean;
  granted: boolean;
};

export type UserCreateCommand = {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  passwordHash: string;
};

export type UserUpdateCommand = {
  name?: string;
  phone?: string;
  role?: StaffRole;
};

export type UserStatusCommand = { active: boolean };

export type UserPermissionCommand = { permissions: string[] };
export type UserRemovalResult = { id: string; deleted: true };

export abstract class IUserRepository {
  abstract list(
    user: AuthUser,
    query?: ListQuery,
  ): Promise<PaginatedResult<User>>;
  abstract findOne(user: AuthUser, id: string): Promise<User>;
  abstract getPermissions(
    user: AuthUser,
    id: string,
  ): Promise<UserPermissionView[]>;
  abstract setPermissions(
    user: AuthUser,
    id: string,
    input: UserPermissionCommand,
  ): Promise<UserPermissionView[]>;
  abstract create(user: AuthUser, input: UserCreateCommand): Promise<User>;
  abstract update(
    user: AuthUser,
    id: string,
    input: UserUpdateCommand,
  ): Promise<User>;
  abstract setStatus(
    user: AuthUser,
    id: string,
    input: UserStatusCommand,
  ): Promise<User>;
  abstract remove(user: AuthUser, id: string): Promise<UserRemovalResult>;
}
