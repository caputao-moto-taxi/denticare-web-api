import { AuthUser } from '../../../../auth/auth-user';
import { IUserRepository } from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';

export type GetUserInput = {
  user: AuthUser;
  id: string;
};

export class GetUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({ user, id }: GetUserInput): Promise<UserOutput> {
    UserManagementPolicy.ensureAdministrator(user);
    return UserOutputMapper.toOutput(await this.repository.findOne(user, id));
  }
}
