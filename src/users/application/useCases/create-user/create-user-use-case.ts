import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { IUserRepository, StaffRole } from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';

export type CreateUserInput = {
  user: AuthUser;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  password: string;
};

export class CreateUserUseCase {
  constructor(
    private readonly repository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: CreateUserInput): Promise<UserOutput> {
    UserManagementPolicy.ensureAdministrator(input.user);
    const { user, password, ...userData } = input;
    const passwordHash = await this.hashService.hashPassword(password);
    const created = await this.repository.create(user, {
      ...userData,
      passwordHash,
    });
    return UserOutputMapper.toOutput(created);
  }
}
