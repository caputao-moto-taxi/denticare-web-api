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

export type UserPermissionData = {
  roleSlug: string | null;
  rolePermissionSlugs: string[];
  overrides: { slug: string; granted: boolean }[];
  permissions: {
    id: string;
    slug: string;
    name: string;
    description: string;
  }[];
};

export type UserPermissionOverride = {
  userId: string;
  permissionId: string;
  granted: boolean;
};

export type UserCreateCommand = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  passwordHash: string;
};

export type UserUpdateCommand = {
  firstName?: string;
  lastName?: string;
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
  abstract getPermissionData(
    user: AuthUser,
    id: string,
  ): Promise<UserPermissionData>;
  abstract savePermissionOverrides(
    id: string,
    overrides: UserPermissionOverride[],
  ): Promise<void>;
  abstract emailExists(email: string): Promise<boolean>;
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
