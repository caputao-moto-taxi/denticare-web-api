import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserPermissionView,
} from '../../../domain/user.repository';
import { UserManagementPolicy } from '../../user-management.policy';

export type GetUserPermissionsInput = {
  user: AuthUser;
  id: string;
};

export class GetUserPermissionsUseCase {
  constructor(private readonly repository: IUserRepository) {}

  execute({
    user,
    id,
  }: GetUserPermissionsInput): Promise<UserPermissionView[]> {
    UserManagementPolicy.ensureAdministrator(user);
    return this.repository.getPermissions(user, id);
  }
}
