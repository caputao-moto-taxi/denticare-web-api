import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../../auth/auth-user';

export class DoctorManagementPolicy {
  static ensureCanCreate(user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can add doctors',
      );
    }
  }

  static ensureCanUpdate(user: AuthUser, doctorId: string) {
    if (
      user.role !== 'admin' &&
      !(user.role === 'doctor' && user.id === doctorId)
    ) {
      throw new ForbiddenException('You cannot update this doctor profile');
    }
  }

  static ensureCanRemove(user: AuthUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only clinic administrators can deactivate doctors',
      );
    }
  }
}
