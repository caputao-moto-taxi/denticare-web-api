import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';

export class UserManagementPolicy {
  static ensureAdministrator(user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can manage users',
      );
    }
  }

  static ensureNotSelf(user: AuthUser, targetId: string, message: string) {
    if (user.id === targetId) {
      throw new ForbiddenException(message);
    }
  }
}
