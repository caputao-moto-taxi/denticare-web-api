import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserPermissionCommand,
  UserPermissionView,
} from '../../../domain/user.repository';
import { UserManagementPolicy } from '../../user-management.policy';

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
    return this.repository.setPermissions(user, id, permissions);
  }
}
