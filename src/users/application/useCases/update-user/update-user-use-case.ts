import { AuthUser } from '../../../../auth/auth-user';
import {
  IUserRepository,
  UserUpdateCommand,
} from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';

export type UpdateUserInput = {
  user: AuthUser;
  id: string;
  changes: UserUpdateCommand;
};

export class UpdateUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({ user, id, changes }: UpdateUserInput): Promise<UserOutput> {
    UserManagementPolicy.ensureAdministrator(user);
    return UserOutputMapper.toOutput(
      await this.repository.update(user, id, changes),
    );
  }
}
