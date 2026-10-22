import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserRemovalResult,
} from '../../../domain/user.repository';
import { UserManagementPolicy } from '../../user-management.policy';

export type DeleteUserInput = {
  user: AuthUser;
  id: string;
};

export class DeleteUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  execute({ user, id }: DeleteUserInput): Promise<UserRemovalResult> {
    UserManagementPolicy.ensureAdministrator(user);
    UserManagementPolicy.ensureNotSelf(
      user,
      id,
      'You cannot remove your own account',
    );
    return this.repository.remove(user, id);
  }
}
