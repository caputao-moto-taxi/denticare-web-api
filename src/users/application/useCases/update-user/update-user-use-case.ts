import { AuthUser } from '../../../../auth/auth-user';
import { IUserRepository, StaffRole } from '../../../domain/user.repository';
import { UserOutput, UserOutputMapper } from '../../common/user.output';
import { UserManagementPolicy } from '../../user-management.policy';
import { splitName } from '../../../../shared/helpers/staff';

export type UpdateUserInput = {
  user: AuthUser;
  id: string;
  changes: { name?: string; phone?: string; role?: StaffRole };
};

export class UpdateUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute({ user, id, changes }: UpdateUserInput): Promise<UserOutput> {
    UserManagementPolicy.ensureAdministrator(user);
    if (changes.role !== undefined) {
      const current = await this.repository.findOne(user, id);
      if (changes.role !== current.role) {
        UserManagementPolicy.ensureNotSelf(
          user,
          id,
          'You cannot change your own role',
        );
      }
    }
    const nameParts =
      changes.name !== undefined ? splitName(changes.name) : undefined;
    return UserOutputMapper.toOutput(
      await this.repository.update(user, id, {
        ...(nameParts ?? {}),
        ...(changes.phone !== undefined && { phone: changes.phone.trim() }),
        ...(changes.role !== undefined && { role: changes.role }),
      }),
    );
  }
}
