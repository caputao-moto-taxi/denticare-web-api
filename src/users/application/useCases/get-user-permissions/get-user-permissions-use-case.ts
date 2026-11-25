import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserPermissionView,
} from '../../../domain/user.repository';
import { UserManagementPolicy } from '../../user-management.policy';
import { UserPermissionsPolicy } from '../../user-permissions.policy';

export type GetUserPermissionsInput = {
  user: AuthUser;
  id: string;
};

export class GetUserPermissionsUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({
    user,
    id,
  }: GetUserPermissionsInput): Promise<UserPermissionView[]> {
    UserManagementPolicy.ensureAdministrator(user);
    return UserPermissionsPolicy.toViews(
      await this.repository.getPermissionData(user, id),
    );
  }
}
