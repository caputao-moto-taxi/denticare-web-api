import { AuthUser } from '../../../../auth/auth-user';
import { IHashService } from '../../../../shared/application/interfaces/IHash';
import { IUserRepository, StaffRole } from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';
import { ConflictException } from '@nestjs/common';
import { splitName } from '../../../../shared/helpers/staff';

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
    const email = input.email.trim().toLowerCase();
    if (await this.repository.emailExists(email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const { firstName, lastName } = splitName(input.name);
    const { password } = input;
    const passwordHash = await this.hashService.hashPassword(password);
    const created = await this.repository.create(input.user, {
      firstName,
      lastName,
      email,
      phone: input.phone?.trim(),
      role: input.role,
      passwordHash,
    });
    return UserOutputMapper.toOutput(created);
  }
}
