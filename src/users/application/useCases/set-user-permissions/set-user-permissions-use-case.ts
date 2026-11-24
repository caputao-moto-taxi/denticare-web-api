import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserPermissionCommand,
  UserPermissionView,
} from '../../../domain/user.repository';
import { UserManagementPolicy } from '../../user-management.policy';
import { UserPermissionsPolicy } from '../../user-permissions.policy';

export type SetUserPermissionsInput = {
  user: AuthUser;
  id: string;
  permissions: UserPermissionCommand;
};

export class SetUserPermissionsUseCase {
  constructor(private readonly repository: IUserRepository) {}

  execute({
    user,
    id,
    permissions,
  }: SetUserPermissionsInput): Promise<UserPermissionView[]> {
    UserManagementPolicy.ensureAdministrator(user);
    return this.update(user, id, permissions);
  }

  private async update(
    user: AuthUser,
    id: string,
    permissions: UserPermissionCommand,
  ): Promise<UserPermissionView[]> {
    const data = await this.repository.getPermissionData(user, id);
    const overrides = UserPermissionsPolicy.createOverrides(
      data,
      id,
      permissions.permissions,
    );
    await this.repository.savePermissionOverrides(id, overrides);
    return UserPermissionsPolicy.toViews(
      await this.repository.getPermissionData(user, id),
    );
  }
}
