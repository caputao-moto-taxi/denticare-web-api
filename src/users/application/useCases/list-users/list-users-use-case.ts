import { AuthUser } from '../../../../auth/auth-user';
import {
  ListQuery,
  PaginatedResult,
} from '../../../../shared/domain/list-query';
import { IUserRepository } from '../../../domain/user.repository';
import { User } from '../../../domain/user.entity';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';

export type ListUsersInput = {
  user: AuthUser;
  query?: ListQuery;
};

export class ListUsersUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({
    user,
    query,
  }: ListUsersInput): Promise<PaginatedResult<UserOutput>> {
    UserManagementPolicy.ensureAdministrator(user);
    const result = await this.repository.list(user, query);
    return {
      ...result,
      data: result.data.map((item: User) => UserOutputMapper.toOutput(item)),
    };
  }
}
