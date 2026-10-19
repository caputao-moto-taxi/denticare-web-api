import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserStatusCommand,
} from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';

export type SetUserStatusInput = {
  user: AuthUser;
  id: string;
  status: UserStatusCommand;
};

export class SetUserStatusUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({ user, id, status }: SetUserStatusInput): Promise<UserOutput> {
    UserManagementPolicy.ensureAdministrator(user);
    UserManagementPolicy.ensureNotSelf(
      user,
      id,
      'You cannot change your own status',
    );
    return UserOutputMapper.toOutput(
      await this.repository.setStatus(user, id, status),
    );
  }
}
